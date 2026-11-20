import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const secureStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof globalThis.localStorage === 'undefined') throw new Error('Browser storage is unavailable.');
      return globalThis.localStorage.getItem(key);
    }
    const countText = await SecureStore.getItemAsync(`${key}.parts`);
    if (!countText) return null;
    const count = Number(countText);
    if (!Number.isSafeInteger(count) || count < 1 || count > 100) return null;
    let value = '';
    for (let index = 0; index < count; index++) {
      const part = await SecureStore.getItemAsync(`${key}.${index}`);
      if (part === null) return null;
      value += part;
    }
    return decodeURIComponent(value);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      if (typeof globalThis.localStorage === 'undefined') throw new Error('Browser storage is unavailable.');
      globalThis.localStorage.setItem(key, value);
      return;
    }
    await this.removeItem(key);
    const parts = encodeURIComponent(value).match(/.{1,1500}/g) ?? [''];
    if (parts.length > 100) throw new Error('The secure sign-in session is larger than this device can store.');
    for (let index = 0; index < parts.length; index++) await SecureStore.setItemAsync(`${key}.${index}`, parts[index]);
    await SecureStore.setItemAsync(`${key}.parts`, String(parts.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof globalThis.localStorage === 'undefined') throw new Error('Browser storage is unavailable.');
      globalThis.localStorage.removeItem(key);
      return;
    }
    const countText = await SecureStore.getItemAsync(`${key}.parts`);
    const count = Math.min(100, Math.max(0, Number(countText) || 0));
    await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${index}`)));
    await SecureStore.deleteItemAsync(`${key}.parts`);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const isSupabaseConfigured = Boolean(url && key);
let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });
  return client;
}
