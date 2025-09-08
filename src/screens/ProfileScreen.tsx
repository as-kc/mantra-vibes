import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Card, List, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileRole } from '../hooks/useProfileRole';
import { useTheme } from '../contexts/ThemeContext';
import { containers, spaces, layout, textAlign } from '../styles';

export default function ProfileScreen({ navigation }: any) {
  const role = useProfileRole();
  const { themeMode, setThemeMode, isDark } = useTheme();

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
    <SafeAreaView style={containers.safeAreaScreen}>
      <View style={containers.screen}>
        <Text variant='titleLarge' style={textAlign.center}>
          Profile
        </Text>

      <Card style={[containers.card, spaces.marginTopLG]}>
        <Card.Content style={containers.cardContent}>
          <Text variant='titleMedium' style={spaces.marginBottomSM}>
            Account Information
          </Text>
          <Text>Role: {role}</Text>
        </Card.Content>
      </Card>

      <Card style={containers.card}>
        <Card.Content style={containers.cardContent}>
          <Text variant='titleMedium' style={spaces.marginBottomSM}>
            Theme Settings
          </Text>
          <RadioButton.Group onValueChange={setThemeMode} value={themeMode}>
            <List.Item
              title='Light Theme'
              left={() => <RadioButton value='light' />}
              onPress={() => setThemeMode('light')}
            />
            <List.Item
              title='Dark Theme'
              left={() => <RadioButton value='dark' />}
              onPress={() => setThemeMode('dark')}
            />
            <List.Item
              title='System Default'
              left={() => <RadioButton value='system' />}
              onPress={() => setThemeMode('system')}
            />
          </RadioButton.Group>
          <Text variant='bodySmall' style={[spaces.marginTopSM, styles.themeStatus]}>
            Current mode: {themeMode} {isDark ? '(Dark)' : '(Light)'}
          </Text>
        </Card.Content>
      </Card>

      <View style={spaces.marginTopXXL}>
        <Button mode='outlined' onPress={handleLogout} style={styles.logoutButton}>
          Logout
        </Button>
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    borderColor: '#b00020',
  },
  themeStatus: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
