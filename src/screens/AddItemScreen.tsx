
import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { supabase } from '../lib/supabase';

export default function AddItemScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [lowThreshold, setLowThreshold] = useState('5');
  const [tagsCsv, setTagsCsv] = useState('');

  const handleAdd = async () => {
    const { data, error } = await supabase.rpc('add_item_with_tags', {
      p_name: name,
      p_sku: sku || null,
      p_initial_stock: parseInt(initialStock || '0', 10),
      p_low_stock_threshold: parseInt(lowThreshold || '0', 10),
      p_tags_csv: tagsCsv || null
    });
    if (error) {
      alert(error.message);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Text variant="titleLarge">Add New Item</Text>
      <TextInput label="Name" value={name} onChangeText={setName} />
      <TextInput label="SKU (optional)" value={sku} onChangeText={setSku} />
      <TextInput label="Initial Stock" value={initialStock} onChangeText={setInitialStock} keyboardType="number-pad" />
      <TextInput label="Low-stock threshold" value={lowThreshold} onChangeText={setLowThreshold} keyboardType="number-pad" />
      <TextInput label="Tags CSV (e.g. bestseller,gift)" value={tagsCsv} onChangeText={setTagsCsv} />
      <Button mode="contained" onPress={handleAdd}>Save</Button>
    </View>
  );
}
