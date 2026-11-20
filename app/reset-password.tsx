import { router } from 'expo-router';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { getSupabaseClient } from '@/services/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const { colors } = useTheme(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const client = getSupabaseClient(); if (!client) return;
    const handle = async (url: string) => {
      try {
        const parsed = new URL(url); const params = new URLSearchParams(`${parsed.searchParams.toString()}&${parsed.hash.replace(/^#/, '')}`);
        const tokenHash = params.get('token_hash'); const accessToken = params.get('access_token'); const refreshToken = params.get('refresh_token');
        if (tokenHash) { const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }); if (error) throw error; }
        else if (accessToken && refreshToken) { const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }); if (error) throw error; }
        else throw new Error('The recovery link is incomplete. Request a new link from the account screen.');
        setReady(true);
      } catch (error) { Alert.alert('Recovery link problem', error instanceof Error ? error.message : 'Request a new recovery link.'); }
    };
    const listener = Linking.addEventListener('url', event => { void handle(event.url); });
    void Linking.getInitialURL().then(url => { if (url) void handle(url); });
    return () => listener.remove();
  }, []);
  async function save() {
    const client = getSupabaseClient(); if (!client) return;
    if (!ready) { Alert.alert('Open the recovery link', 'Use the link sent to your email on this device first.'); return; }
    if (password.length < 8 || password !== confirm) { Alert.alert('Check your password', password.length < 8 ? 'Use at least 8 characters.' : 'The passwords do not match.'); return; }
    setBusy(true); try { const { error } = await client.auth.updateUser({ password }); if (error) throw error; Alert.alert('Password updated', 'Your password has been changed. Sign in with the new password.'); router.replace('/account'); }
    catch (error) { Alert.alert('Could not update password', error instanceof Error ? error.message : 'Please request a new recovery link.'); } finally { setBusy(false); }
  }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><View style={styles.content}><AppText style={styles.title} localized>Reset password</AppText><Surface style={styles.info}><AppText style={[styles.body, { color: colors.muted }]} localized>{ready ? 'Choose a new password for your Hisab account.' : 'Open the password recovery email link on this device to continue.'}</AppText></Surface><TextInput accessibilityLabel="New password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} /><TextInput accessibilityLabel="Confirm new password" secureTextEntry autoComplete="new-password" value={confirm} onChangeText={setConfirm} placeholder="Confirm password" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} /><TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void save()} style={styles.button}><AppText style={styles.buttonText} localized>{busy ? 'Updating…' : 'Update password'}</AppText></TouchableOpacity></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, gap: 12, paddingTop: 30 }, title: { fontSize: 24, fontWeight: '700', marginBottom: 8 }, info: { padding: 14 }, body: { fontSize: 12, lineHeight: 18 }, input: { height: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13 }, button: { minHeight: 50, backgroundColor: palette.blue, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '700' } });
