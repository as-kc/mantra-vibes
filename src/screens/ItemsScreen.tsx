import React, { useMemo, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, Searchbar, FAB, Chip, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useReport } from '../contexts/ReportContext';
import { useProfileRole } from '../hooks/useProfileRole';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ItemModal } from '../components/ItemModal';
import { layout, containers, spaces, chips } from '../styles';

export default function ItemsScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  const queryClient = useQueryClient();
  const { role } = useProfileRole();

  const { addItemToReport, clearReport, getCurrentReportItems, hasItem, removeLine, lines } =
    useReport();

  const handleAddItemToReport = (itemId: string) => {
    addItemToReport(itemId);
  };

  const handleRemoveItemFromReport = (itemId: string) => {
    const idx = lines.findIndex(l => l.itemId === itemId);
    if (idx !== -1) {
      removeLine(idx);
    }
  };

  const handleClearReport = () => {
    clearReport();
    setClearDialogVisible(false);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setModalMode('edit');
    setItemModalVisible(true);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setModalMode('add');
    setItemModalVisible(true);
  };

  const handleSaveItem = async (formData: any, tags: string[]) => {
    try {
      if (modalMode === 'add') {
        // Create new item
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .insert({
            name: formData.name.trim(),
            sku: formData.sku.trim() || null,
            current_stock: parseInt(formData.current_stock) || 0,
            low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
          })
          .select()
          .single();

        if (itemError) {
          throw itemError;
        }

        // Add tags
        for (const tagName of tags) {
          const { data: tagData, error: tagError } = await supabase
            .from('tags')
            .upsert({ name: tagName }, { onConflict: 'name' })
            .select()
            .single();

          if (tagError) {
            throw tagError;
          }

          await supabase.from('item_tags').insert({ item_id: itemData.id, tag_id: tagData.id });
        }
      } else {
        // Update existing item
        const { error: itemError } = await supabase
          .from('items')
          .update({
            name: formData.name.trim(),
            sku: formData.sku.trim() || null,
            current_stock: parseInt(formData.current_stock) || 0,
            low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
          })
          .eq('id', editingItem.id);

        if (itemError) {
          throw itemError;
        }

        // Handle tags
        const currentTags = editingItem.tags || [];
        const tagsToAdd = tags.filter(tag => !currentTags.includes(tag));
        const tagsToRemove = currentTags.filter(tag => !tags.includes(tag));

        // Add new tags
        for (const tagName of tagsToAdd) {
          const { data: tagData, error: tagError } = await supabase
            .from('tags')
            .upsert({ name: tagName }, { onConflict: 'name' })
            .select()
            .single();

          if (tagError) {
            throw tagError;
          }

          await supabase.from('item_tags').insert({ item_id: editingItem.id, tag_id: tagData.id });
        }

        // Remove tags
        for (const tagName of tagsToRemove) {
          const { data: tagData } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .single();

          if (tagData) {
            await supabase
              .from('item_tags')
              .delete()
              .eq('item_id', editingItem.id)
              .eq('tag_id', tagData.id);
          }
        }
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items-basic'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    } catch (error: any) {
      alert(`Error ${modalMode === 'add' ? 'creating' : 'updating'} item: ` + error.message);
      throw error;
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase.from('items').delete().eq('id', itemId);

    if (error) {
      alert('Error deleting item: ' + error.message);
      throw error;
    }

    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['items'] });
    queryClient.invalidateQueries({ queryKey: ['items-basic'] });
  };

  const itemsQ = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items_view').select('*').order('name');
      if (error) {
        throw error;
      }
      return data;
    },
  });

  const tagsQ = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*').order('name');
      if (error) {
        throw error;
      }
      return data;
    },
  });

  const filtered = useMemo(() => {
    const list = itemsQ.data ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((i: any) => {
      const matchesText =
        !q || i.name.toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q);
      const matchesTag = !activeTag || (i.tags || []).includes(activeTag);
      return matchesText && matchesTag;
    });
  }, [itemsQ.data, query, activeTag]);

  const currentReportItems = getCurrentReportItems(itemsQ.data);

  return (
    <SafeAreaView style={containers.safeAreaScreen}>
      <View style={styles.searchSection}>
        <Searchbar placeholder='Search items or SKU' value={query} onChangeText={setQuery} />

        {/* Current Report Status */}
        {currentReportItems.length > 0 && (
          <Card style={styles.reportCard}>
            <Card.Content>
              <View style={[layout.flexRow, layout.spaceBetween, layout.centerHorizontal]}>
                <Text variant='titleMedium'>
                  Current Report ({currentReportItems.length} items)
                </Text>
                <IconButton icon='delete' onPress={() => setClearDialogVisible(true)} />
              </View>
              <Text variant='bodySmall'>
                {currentReportItems.map((item: any) => item.name).join(', ')}
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={chips.container}>
          {(tagsQ.data ?? []).map((t: any) => (
            <Chip
              key={t.id}
              selected={activeTag === t.name}
              onPress={() => setActiveTag(activeTag === t.name ? null : t.name)}
            >
              {t.name}
            </Chip>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => {
          const isInReport = hasItem(item.id);
          return (
            <Card style={containers.card}>
              <Card.Title title={item.name} />
              <Card.Content>
                <Text>Current Stock: {item.current_stock}</Text>
                {item.is_low && <Text style={styles.lowStockText}>Low stock!</Text>}
                {item.tags?.length ? <Text>Tags: {item.tags.join(', ')} </Text> : null}
                {isInReport && (
                  <Text style={styles.inReportText}>✓ In current report</Text>
                )}
              </Card.Content>
              <Card.Actions>
                {isInReport ? (
                  <IconButton icon='minus' onPress={() => handleRemoveItemFromReport(item.id)} />
                ) : (
                  <IconButton icon='plus' onPress={() => handleAddItemToReport(item.id)} />
                )}
                {role === 'admin' && (
                  <IconButton icon='pencil' onPress={() => handleEditItem(item)} />
                )}
              </Card.Actions>
            </Card>
          );
        }}
      />

      <FAB
        style={containers.fabPosition}
        icon='plus'
        onPress={handleAddItem}
      />

      {/* Clear Report Confirmation Dialog */}
      <ConfirmationDialog
        visible={clearDialogVisible}
        onDismiss={() => setClearDialogVisible(false)}
        onConfirm={handleClearReport}
        title='Clear Current Report?'
        message='This will remove all items from the current report. Are you sure?'
        confirmText='Clear Report'
        cancelText='Cancel'
      />

      {/* Reusable Item Modal */}
      <ItemModal
        visible={itemModalVisible}
        onDismiss={() => setItemModalVisible(false)}
        onSave={handleSaveItem}
        onDelete={modalMode === 'edit' ? handleDeleteItem : undefined}
        item={editingItem}
        mode={modalMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    padding: 12,
    gap: 8,
  },
  reportCard: {
    backgroundColor: '#e3f2fd',
  },
  lowStockText: {
    color: 'tomato',
  },
  inReportText: {
    color: 'green',
    fontWeight: 'bold',
  },
});
