
import React from 'react';
import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, Text } from 'react-native-paper';

export default function AdminScreen() {
  const itemsQ = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items_view').select('*').order('current_stock');
      if (error) {throw error;}
      return data;
    },
  });

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text variant="titleLarge">Admin</Text>
      <Text>Low-stock items:</Text>
      <FlatList
        data={(itemsQ.data ?? []).filter((i:any)=>i.is_low)}
        keyExtractor={(i:any) => i.id}
        renderItem={({ item }: any) => (
          <Card style={{ marginVertical: 6 }}>
            <Card.Title title={item.name} subtitle={`SKU: ${item.sku || '—'}`} />
            <Card.Content>
              <Text>Current: {item.current_stock} | Threshold: {item.low_stock_threshold}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}
