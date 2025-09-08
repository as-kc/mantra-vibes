import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

export async function registerForPushAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Save on profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', user.id);
  }
  return token;
}
