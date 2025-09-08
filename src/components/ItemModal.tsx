import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, TextInput, Button, Text, Chip } from 'react-native-paper';
import { layout, spaces, forms, chips } from '../styles';

type ItemFormData = {
  name: string;
  sku: string;
  low_stock_threshold: string;
  current_stock: string;
};

type ItemModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: ItemFormData, tags: string[]) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
  item?: any; // null for new item, item object for editing
  mode: 'add' | 'edit';
};

export const ItemModal: React.FC<ItemModalProps> = ({
  visible,
  onDismiss,
  onSave,
  onDelete,
  item,
  mode,
}) => {
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    sku: '',
    low_stock_threshold: '5',
    current_stock: '0',
  });
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form when modal opens or item changes
  useEffect(() => {
    if (visible && item) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        low_stock_threshold: item.low_stock_threshold?.toString() || '5',
        current_stock: item.current_stock?.toString() || '0',
      });
      setTags([...(item.tags || [])]);
    } else if (visible && mode === 'add') {
      setFormData({
        name: '',
        sku: '',
        low_stock_threshold: '5',
        current_stock: '0',
      });
      setTags([]);
    }
    setNewTag('');
  }, [visible, item, mode]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData, tags);
      handleClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onDismiss();
    setFormData({ name: '', sku: '', low_stock_threshold: '5', current_stock: '0' });
    setTags([]);
    setNewTag('');
    setIsLoading(false);
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleDelete = async () => {
    if (!onDelete || !item) {
      return;
    }

    setIsLoading(true);
    try {
      await onDelete(item.id);
      handleClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const title = mode === 'add' ? 'Add New Item' : 'Edit Item';
  const saveButtonText = mode === 'add' ? 'Create' : 'Save';

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label='Name *'
            value={formData.name}
            onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
            style={forms.input}
          />
          <TextInput
            label='SKU (optional)'
            value={formData.sku}
            onChangeText={text => setFormData(prev => ({ ...prev, sku: text }))}
            style={forms.input}
          />
          <TextInput
            label='Current Stock'
            value={formData.current_stock}
            onChangeText={text => setFormData(prev => ({ ...prev, current_stock: text }))}
            keyboardType='number-pad'
            style={forms.input}
          />
          <TextInput
            label='Low Stock Threshold'
            value={formData.low_stock_threshold}
            onChangeText={text => setFormData(prev => ({ ...prev, low_stock_threshold: text }))}
            keyboardType='number-pad'
            style={spaces.marginBottomLG}
          />

          {/* Tags Section */}
          <Text variant='titleMedium' style={spaces.marginBottomSM}>
            Tags
          </Text>
          <View style={[layout.flexRow, spaces.marginBottomSM]}>
            <TextInput
              label='Add new tag'
              value={newTag}
              onChangeText={setNewTag}
              style={styles.tagInput}
              onSubmitEditing={addTag}
            />
            <Button onPress={addTag}>Add</Button>
          </View>

          {/* Current Tags */}
          <View style={chips.container}>
            {tags.map((tag, index) => (
              <Chip key={index} onClose={() => removeTag(tag)} closeIcon='close'>
                {tag}
              </Chip>
            ))}
            {tags.length === 0 && (
              <Text style={styles.noTagsText}>No tags</Text>
            )}
          </View>
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onPress={handleSave} disabled={isLoading || !formData.name.trim()}>
            {saveButtonText}
          </Button>
        </Dialog.Actions>

        {/* Delete button for edit mode */}
        {mode === 'edit' && onDelete && (
          <Dialog.Actions style={styles.deleteButtonContainer}>
            <Button onPress={handleDelete} disabled={isLoading}>
              Delete Item
            </Button>
          </Dialog.Actions>
        )}
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  tagInput: {
    flex: 1,
    marginRight: 8,
  },
  noTagsText: {
    fontStyle: 'italic',
    color: '#666',
  },
  deleteButtonContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
});
