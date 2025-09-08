import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { layout, containers, spaces, textAlign, forms } from '../styles';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw error;
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[layout.flex1, layout.centerVertical, styles.container]}>
      <Text variant='headlineMedium' style={[textAlign.center, spaces.marginBottomSM]}>
        Inventory Login
      </Text>
      
      <View style={forms.inputGroup}>
        <TextInput
          label='Email'
          value={email}
          onChangeText={setEmail}
          autoCapitalize='none'
          keyboardType='email-address'
          style={forms.input}
        />
        <TextInput 
          label='Password' 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
          style={forms.input}
        />
        
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        <Button 
          mode='contained' 
          onPress={handleAuth} 
          loading={loading}
          style={spaces.marginTopSM}
        >
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </Button>
        
        <Button onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  errorText: {
    color: '#b00020',
  },
});
