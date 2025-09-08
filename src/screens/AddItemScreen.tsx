
import React, { useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ItemModal } from '../components/ItemModal';

export default function AddItemScreen({ navigation }: any) {
  const [modalVisible, setModalVisible] = useState(true);
  const queryClient = useQueryClient();

  const handleSave = async (formData: any, tags: string[]) => {
    try {
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

      if (itemError) {throw itemError;}

      // Add tags
      for (const tagName of tags) {
        const { data: tagData, error: tagError } = await supabase
          .from('tags')
          .upsert({ name: tagName }, { onConflict: 'name' })
          .select()
          .single();

        if (tagError) {throw tagError;}

        await supabase
          .from('item_tags')
          .insert({ item_id: itemData.id, tag_id: tagData.id });
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items-basic'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });

      // Navigate back
      navigation.goBack();

    } catch (error: any) {
      alert('Error creating item: ' + error.message);
      throw error;
    }
  };

  const handleDismiss = () => {
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <ItemModal
        visible={modalVisible}
        onDismiss={handleDismiss}
        onSave={handleSave}
        mode="add"
      />
    </View>
  );
}
