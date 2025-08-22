
import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export default function ReportsScreen() {
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const reportsQ = useQuery({
    queryKey: ['reports', from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('reports_between', { p_from: from, p_to: to });
      if (error) throw error;
      return data as any[];
    }
  });

  const totals = (reportsQ.data ?? []).reduce((acc: any, r: any) => {
    acc.sold += r.sold;
    acc.revenue += r.revenue || 0;
    return acc;
  }, { sold: 0, revenue: 0 });

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text variant="titleLarge">Reports</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput label="From (YYYY-MM-DD)" style={{ flex: 1 }} value={from} onChangeText={setFrom} />
        <TextInput label="To (YYYY-MM-DD)" style={{ flex: 1 }} value={to} onChangeText={setTo} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8 }}>
        <Text>Total sold: {totals.sold}</Text>
        <Text>Total revenue: {totals.revenue.toFixed(2)}</Text>
      </View>

      <FlatList
        data={reportsQ.data ?? []}
        keyExtractor={(r: any) => r.id}
        renderItem={({ item }: any) => (
          <Card style={{ marginVertical: 6 }}>
            <Card.Title title={item.item_name} subtitle={dayjs(item.created_at).format('YYYY-MM-DD HH:mm')} />
            <Card.Content>
              <Text>Start: {item.start_stock}  End: {item.end_stock}  Sold: {item.sold}</Text>
              {item.revenue != null && <Text>Revenue: {item.revenue}</Text>}
              {item.note && <Text>Note: {item.note}</Text>}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}
