
import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Session } from '@supabase/supabase-js';
import { PaperProvider } from 'react-native-paper';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import ItemsScreen from './screens/ItemsScreen';
import AddItemScreen from './screens/AddItemScreen';
import StockReportScreen from './screens/StockReportScreen';
import ReportsScreen from './screens/ReportsScreen';
import AdminScreen from './screens/AdminScreen';
import ProfileScreen from './screens/ProfileScreen';
import { useProfileRole } from './hooks/useProfileRole';
import { ReportProvider } from './contexts/ReportContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const queryClient = new QueryClient();

function AppTabs() {
  const role = useProfileRole();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Items') {
            iconName = 'package-variant';
          } else if (route.name === 'Reports') {
            iconName = 'chart-line';
          } else if (route.name === 'Stock') {
            iconName = 'plus-circle';
          } else if (route.name === 'Admin') {
            iconName = 'shield-account';
          } else if (route.name === 'Profile') {
            iconName = 'account';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Items" component={ItemsScreen} />
      <Tabs.Screen name="Reports" component={ReportsScreen} />
      <Tabs.Screen name="Stock" component={StockReportScreen} options={{ title: 'Add Report' }} />
      {role === 'admin' && <Tabs.Screen name="Admin" component={AdminScreen} />}
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <PaperProvider>
      <QueryClientProvider client={queryClient}>
        <ReportProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {session ? (
                <Stack.Screen name="Main" component={AppTabs} />
              ) : (
                <Stack.Screen name="Auth" component={AuthScreen} />
              )}
              <Stack.Screen name="AddItem" component={AddItemScreen} options={{ headerShown: true, title: 'Add Item' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </ReportProvider>
      </QueryClientProvider>
    </PaperProvider>
  );
}
