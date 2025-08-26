
import React, { useMemo, useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card, Portal, Dialog, Searchbar, List, IconButton } from 'react-native-paper';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReport } from '../contexts/ReportContext';

export default function StockReportScreen({ route }: any) {
  const itemIdParam = route?.params?.itemId || null;
  const [reportName, setReportName] = useState('Current Report');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLineIndex, setPickerLineIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [clearDialogVisible, setClearDialogVisible] = useState(false);

  const queryClient = useQueryClient();

  const {
    lines,
    note,
    totalRevenue,
    addItemToReport,
    removeLine,
    setLine,
    addLine,
    setNote,
    setTotalRevenue,
    clearReport,
  } = useReport();

  // Initialize with route param if provided
  useEffect(() => {
    if (itemIdParam && !lines.some(l => l.itemId === itemIdParam)) {
      addItemToReport(itemIdParam);
    }
  }, [itemIdParam, addItemToReport, lines]);

  const itemsQ = useQuery({
    queryKey: ['items-basic'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('id,name').order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        const sold = Math.max(0, parseInt(l.start || '0', 10) - parseInt(l.end || '0', 10));
        acc.sold += sold;
        return acc;
      },
      { sold: 0 }
    );
  }, [lines]);

  const handleSave = async () => {
    if (!lines.length) { alert('Add at least one item'); return; }
    if (lines.some(l => !l.itemId)) { alert('Each line needs an item'); return; }
    const payload = lines.map(l => ({
      item_id: l.itemId,
      start_stock: parseInt(l.start || '0', 10),
      end_stock: parseInt(l.end || '0', 10),
    }));
    const { error } = await supabase.rpc('record_stock_report_multi', {
      p_note: note || null,
      p_total_revenue: totalRevenue ? parseFloat(totalRevenue) : null,
      p_lines: payload,
    } as any);
    if (error) { alert(error.message); return; }
    alert('Saved');
    
    // Invalidate queries to trigger re-renders in other tabs
    queryClient.invalidateQueries({ queryKey: ['reports-multi'] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
    queryClient.invalidateQueries({ queryKey: ['items-basic'] });
    
    clearReport();
  };

  const openPicker = (idx: number) => {
    setPickerLineIndex(idx);
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
    setPickerLineIndex(null);
    setSearch('');
  };

  const filteredItems = useMemo(() => {
    const list = itemsQ.data ?? [];
    const q = (search || '').toLowerCase();
    if (!q) return list;
    return list.filter((it: any) => (it.name || '').toLowerCase().includes(q));
  }, [itemsQ.data, search]);

  const addFirstItem = () => {
    addLine();
    // open picker for the new first line
    setTimeout(() => {
      openPicker((lines.length));
    }, 0);
  };

  const handleClearReport = () => {
    clearReport();
    setClearDialogVisible(false);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="titleLarge">{reportName}</Text>
        <IconButton icon="delete" onPress={() => setClearDialogVisible(true)} />
      </View>

      {lines.length === 0 && (
        <Card style={{ padding: 12 }}>
          <Text>No items in this report yet.</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button onPress={addFirstItem}>Add first item</Button>
          </View>
        </Card>
      )}

      {lines.map((l, idx) => {
        const sold = Math.max(0, parseInt(l.start || '0', 10) - parseInt(l.end || '0', 10));
        const itemName = l.itemId ? (itemsQ.data?.find((i:any)=>i.id===l.itemId)?.name ?? l.itemId) : 'Select item';
        return (
          <Card key={idx} style={{ padding: 12 }}>
            <Text variant="titleMedium">Line {idx + 1}</Text>
            <Text>Item</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 }}>
              <Text>{itemName}</Text>
              <Button onPress={() => openPicker(idx)}>Select item</Button>
            </View>
            <TextInput label="Starting stock" value={l.start} onChangeText={(v)=>setLine(idx,{start:v})} keyboardType="number-pad" />
            <TextInput label="Ending stock" value={l.end} onChangeText={(v)=>setLine(idx,{end:v})} keyboardType="number-pad" />
            <Text>Sold (auto): {sold}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Button onPress={() => removeLine(idx)}>Remove</Button>
              {idx === lines.length - 1 && <Button onPress={addLine}>Add another item</Button>}
            </View>
          </Card>
        );
      })}

      <TextInput label="Note (optional)" value={note} onChangeText={setNote} />
      <TextInput 
        label="Total revenue (optional)" 
        value={totalRevenue} 
        onChangeText={setTotalRevenue} 
        keyboardType="decimal-pad" 
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text>Total sold: {totals.sold}</Text>
      </View>

      <Button mode="contained" onPress={handleSave}>Save Report</Button>

      {/* Item Picker Dialog */}
      <Portal>
        <Dialog visible={pickerVisible} onDismiss={closePicker}>
          <Dialog.Title>Select item</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="Search items" value={search} onChangeText={setSearch} style={{ marginBottom: 8 }} />
            {itemsQ.isLoading && <Text>Loading…</Text>}
            {!itemsQ.isLoading && (
              <ScrollView style={{ maxHeight: 300 }}>
                {filteredItems.map((it: any) => (
                  <List.Item
                    key={it.id}
                    title={it.name}
                    onPress={() => {
                      if (pickerLineIndex != null) {
                        setLine(pickerLineIndex, { itemId: it.id });
                      }
                      closePicker();
                    }}
                  />
                ))}
                {filteredItems.length === 0 && <Text>No items</Text>}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closePicker}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Clear Report Confirmation Dialog */}
      <ConfirmationDialog
        visible={clearDialogVisible}
        onDismiss={() => setClearDialogVisible(false)}
        onConfirm={handleClearReport}
        title="Clear Current Report?"
        message="This will remove all items from the current report. Are you sure?"
        confirmText="Clear Report"
        cancelText="Cancel"
      />
    </ScrollView>
  );
}
