import React from 'react';
import { View } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { useProfileRole } from '../hooks/useProfileRole';

export default function ProfileScreen({ navigation }: any) {
  const role = useProfileRole();

  const handleLogout = async () => {
    // Import supabase here to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text variant='titleLarge'>Profile</Text>

      <Card style={{ marginTop: 16, padding: 16 }}>
        <Text variant='titleMedium'>Account Information</Text>
        <Text style={{ marginTop: 8 }}>Role: {role}</Text>
      </Card>

      <View style={{ marginTop: 24 }}>
        <Button
          mode='outlined'
          onPress={handleLogout}
          textColor='red'
          style={{ borderColor: 'red' }}
        >
          Logout
        </Button>
      </View>
    </View>
  );
}
