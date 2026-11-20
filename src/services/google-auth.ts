import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { getSupabaseClient } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthResult = 'redirecting' | 'signed_in' | 'cancelled';

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const redirectTo = Platform.OS === 'web'
    ? new URL('/', globalThis.location.href).toString()
    : Linking.createURL('auth/callback');
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Supabase did not return a Google sign-in URL.');

  if (Platform.OS === 'web') {
    globalThis.location.assign(data.url);
    return 'redirecting';
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';

  const callback = new URL(result.url);
  const callbackError = callback.searchParams.get('error_description') ?? callback.searchParams.get('error');
  if (callbackError) throw new Error(callbackError);

  const code = callback.searchParams.get('code');
  if (!code) throw new Error('Google sign-in did not return an authorization code.');
  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return 'signed_in';
}
