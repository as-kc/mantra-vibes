
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

export default function StockReportScreen({ route }: any) {
  const itemIdParam = route?.params?.itemId || null;
  const [itemId, setItemId] = useState<string | null>(itemIdParam);
  const [start, setStart] = useState('0');
  const [end, setEnd] = useState('0');
  const [revenue, setRevenue] = useState('');
  const [note, setNote] = useState('');

  const itemsQ = useQuery({
    queryKey: ['items-basic'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('id,name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const sold = Math.max(0, parseInt(start || '0', 10) - parseInt(end || '0', 10));

  const handleSave = async () => {
    if (!itemId) { alert('Select an item'); return; }
    const { error } = await supabase.rpc('record_stock_report', {
      p_item_id: itemId,
      p_start_stock: parseInt(start || '0', 10),
      p_end_stock: parseInt(end || '0', 10),
      p_revenue: revenue ? parseFloat(revenue) : null,
      p_note: note || null
    });
    if (error) { alert(error.message); return; }
    alert('Saved');
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Text variant="titleLarge">New Stock Report</Text>
      {/* Minimal picker */}
      <Text>Item</Text>
      <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 }}>
        <Text onPress={() => { /* could implement a proper picker; for starter use first item */ }}>
          {itemId ? (itemsQ.data?.find((i:any)=>i.id===itemId)?.name ?? itemId) : 'Tap "Use first item" for demo'}
        </Text>
        <Button onPress={() => { if (itemsQ.data?.length) setItemId(itemsQ.data[0].id); }}>Use first item</Button>
      </View>

      <TextInput label="Starting stock" value={start} onChangeText={setStart} keyboardType="number-pad" />
      <TextInput label="Ending stock" value={end} onChangeText={setEnd} keyboardType="number-pad" />
      <Text>Sold (auto): {sold}</Text>
      <TextInput label="Revenue (optional)" value={revenue} onChangeText={setRevenue} keyboardType="decimal-pad" />
      <TextInput label="Note (optional)" value={note} onChangeText={setNote} />

      <Button mode="contained" onPress={handleSave}>Save Report</Button>
    </View>
  );
}
