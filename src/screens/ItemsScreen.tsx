import React, { useMemo, useState } from 'react';
import { FlatList, View, Button } from 'react-native';
import { Text, Searchbar, FAB, Chip, Card } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export default function ItemsScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
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

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8 }}>
        <Button title="Logout" onPress={handleLogout} />
        <Searchbar placeholder="Search items or SKU" value={query} onChangeText={setQuery} />
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
        renderItem={({ item }: any) => (
          <Card style={{ margin: 12 }}>
            <Card.Title title={item.name} subtitle={`SKU: ${item.sku || '—'}`} />
            <Card.Content>
              <Text>Current Stock: {item.current_stock}</Text>
              {item.is_low && <Text style={{ color: 'tomato' }}>Low stock!</Text>}
              {item.tags?.length ? <Text>Tags: {item.tags.join(', ')}</Text> : null}
            </Card.Content>
            <Card.Actions>
              <Button title="Add Report" onPress={() => navigation.navigate('Stock', { itemId: item.id })} />
            </Card.Actions>
          </Card>
        )}
      />

      <FAB style={{ position: 'absolute', right: 16, bottom: 16 }} icon="plus" onPress={() => navigation.navigate('AddItem')} />
    </View>
  );
}
