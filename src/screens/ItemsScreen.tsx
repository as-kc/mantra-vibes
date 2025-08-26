import React, { useMemo, useState } from 'react';
import { FlatList, View, Button } from 'react-native';
import { Text, Searchbar, FAB, Chip, Card, Portal, Dialog, IconButton } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useReport } from '../contexts/ReportContext';

export default function ItemsScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);

  const {
    addItemToReport,
    clearReport,
    getCurrentReportItems,
    hasItem,
    removeLine,
    lines,
  } = useReport();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  const handleAddItemToReport = (itemId: string) => {
    addItemToReport(itemId);
  };

  const handleRemoveItemFromReport = (itemId: string) => {
    const idx = lines.findIndex(l => l.itemId === itemId);
    if (idx !== -1) removeLine(idx);
  };

  const handleClearReport = () => {
    clearReport();
    setClearDialogVisible(false);
  };

  const itemsQ = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items_view').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const tagsQ = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const list = itemsQ.data ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((i: any) => {
      const matchesText = !q || i.name.toLowerCase().includes(q) || (i.sku||'').toLowerCase().includes(q);
      const matchesTag = !activeTag || (i.tags || []).includes(activeTag);
      return matchesText && matchesTag;
    });
  }, [itemsQ.data, query, activeTag]);

  const currentReportItems = getCurrentReportItems(itemsQ.data);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8 }}>
        <Button title="Logout" onPress={handleLogout} />
        <Searchbar placeholder="Search items or SKU" value={query} onChangeText={setQuery} />
        
        {/* Current Report Status */}
        {currentReportItems.length > 0 && (
          <Card style={{ backgroundColor: '#e3f2fd' }}>
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="titleMedium">Current Report ({currentReportItems.length} items)</Text>
                <IconButton icon="delete" onPress={() => setClearDialogVisible(true)} />
              </View>
              <Text variant="bodySmall">
                {currentReportItems.map((item: any) => item.name).join(', ')}
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(tagsQ.data ?? []).map((t: any) => (
            <Chip key={t.id} selected={activeTag === t.name} onPress={() => setActiveTag(activeTag === t.name ? null : t.name)}>
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
            <Card style={{ margin: 12 }}>
              <Card.Title title={item.name} />
              <Card.Content>
                <Text>Current Stock: {item.current_stock}</Text>
                {item.is_low && <Text style={{ color: 'tomato' }}>Low stock!</Text>}
                {item.tags?.length ? <Text>Tags: {item.tags.join(', ')} </Text> : null}
                {isInReport && <Text style={{ color: 'green', fontWeight: 'bold' }}>✓ In current report</Text>}
              </Card.Content>
              <Card.Actions>
                {isInReport ? (
                  <IconButton icon="minus" onPress={() => handleRemoveItemFromReport(item.id)} />
                ) : (
                  <IconButton 
                    icon="plus" 
                    onPress={() => handleAddItemToReport(item.id)}
                  />
                )}
              </Card.Actions>
            </Card>
          );
        }}
      />

      <FAB style={{ position: 'absolute', right: 16, bottom: 16 }} icon="plus" onPress={() => navigation.navigate('AddItem')} />

      {/* Clear Report Confirmation Dialog */}
      <Portal>
        <Dialog visible={clearDialogVisible} onDismiss={() => setClearDialogVisible(false)}>
          <Dialog.Title>Clear Current Report?</Dialog.Title>
          <Dialog.Content>
            <Text>This will remove all items from the current report. Are you sure?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button title="Cancel" onPress={() => setClearDialogVisible(false)} />
            <Button title="Clear Report" onPress={handleClearReport} />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
