import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

function browserStorage(): Storage {
  if (typeof globalThis.localStorage === 'undefined') throw new Error('Browser storage is unavailable.');
  return globalThis.localStorage;
}

export async function getPersistentValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return browserStorage().getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function setPersistentValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    browserStorage().setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deletePersistentValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    browserStorage().removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
