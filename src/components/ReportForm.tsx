import React, { useState, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Card, 
  Portal,
  Dialog, 
  Searchbar, 
  List, 
  
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type ReportLine = {
  lineId?: string;
  itemId: string | null;
  itemName?: string;
  start: string;
  end: string;
};

type ReportFormProps = {
  lines: ReportLine[];
  setLines: (lines: ReportLine[]) => void;
  note: string;
  setNote: (note: string) => void;
  totalRevenue: string;
  setTotalRevenue: (revenue: string) => void;
  onSave: () => void;
  saveButtonText?: string;
  showAddFirstItem?: boolean;
  onClearReport?: () => void;
};

export const ReportForm: React.FC<ReportFormProps> = ({
  lines,
  setLines,
  note,
  setNote,
  totalRevenue,
  setTotalRevenue,
  onSave,
  saveButtonText = 'Save Report',
  showAddFirstItem = true,
  onClearReport,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLineIndex, setPickerLineIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const itemsQ = useQuery({
    queryKey: ['items-basic'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('id,name').order('name');
      if (error) {throw error;}
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

  const setLine = (idx: number, patch: Partial<ReportLine>) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    setLines([...lines, { itemId: null, start: '0', end: '0' }]);
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
    if (!q) {return list;}
    return list.filter((it: any) => (it.name || '').toLowerCase().includes(q));
  }, [itemsQ.data, search]);

  const addFirstItem = () => {
    addLine();
    setTimeout(() => {
      openPicker(lines.length);
    }, 0);
  };

  const getItemName = (line: ReportLine) => {
    if (line.itemName) {return line.itemName;}
    if (line.itemId) {
      const item = itemsQ.data?.find((i: any) => i.id === line.itemId);
      return item?.name ?? line.itemId;
    }
    return 'Select item';
  };

  return (
    <>
      {lines.length === 0 && showAddFirstItem && (
        <Card style={{ padding: 12 }}>
          <Text>No items in this report yet.</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button onPress={addFirstItem}>Add first item</Button>
          </View>
        </Card>
      )}

      {lines.map((l, idx) => {
        const sold = Math.max(0, parseInt(l.start || '0', 10) - parseInt(l.end || '0', 10));
        const itemName = getItemName(l);
        return (
          <Card key={idx} style={{ padding: 12, marginVertical: 4 }}>
            <Text variant="titleMedium">Line {idx + 1}</Text>
            <Text>Item</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 }}>
              <Text>{itemName}</Text>
              <Button onPress={() => openPicker(idx)}>Select item</Button>
            </View>
            <TextInput 
              label="Starting stock" 
              value={l.start} 
              onChangeText={(v) => setLine(idx, { start: v })} 
              keyboardType="number-pad" 
            />
            <TextInput 
              label="Ending stock" 
              value={l.end} 
              onChangeText={(v) => setLine(idx, { end: v })} 
              keyboardType="number-pad" 
            />
            <Text>Sold (auto): {sold}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Button onPress={() => removeLine(idx)}>Remove</Button>
              {idx === lines.length - 1 && <Button onPress={addLine}>Add another item</Button>}
            </View>
          </Card>
        );
      })}

      <TextInput 
        label="Note (optional)" 
        value={note} 
        onChangeText={setNote} 
        style={{ marginVertical: 8 }}
      />
      <TextInput 
        label="Total revenue (optional)" 
        value={totalRevenue} 
        onChangeText={setTotalRevenue} 
        keyboardType="decimal-pad" 
        style={{ marginVertical: 8 }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text>Total sold: {totals.sold}</Text>
      </View>

      <Button mode="contained" onPress={onSave}>{saveButtonText}</Button>

      {/* Item Picker Dialog */}
      <Portal>
        <Dialog visible={pickerVisible} onDismiss={closePicker}>
          <Dialog.Title>Select item</Dialog.Title>
          <Dialog.Content>
            <Searchbar 
              placeholder="Search items" 
              value={search} 
              onChangeText={setSearch} 
              style={{ marginBottom: 8 }} 
            />
            {itemsQ.isLoading && <Text>Loading…</Text>}
            {!itemsQ.isLoading && (
              <ScrollView style={{ maxHeight: 300 }}>
                {filteredItems.map((it: any) => (
                  <List.Item
                    key={it.id}
                    title={it.name}
                    onPress={() => {
                      if (pickerLineIndex !== null) {
                        setLine(pickerLineIndex, { itemId: it.id, itemName: it.name });
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
    </>
  );
};