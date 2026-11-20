import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { Surface } from '@/components/Surface';
import { isInitialSetupComplete, loadSyncStatus } from '@/finance/database';
import { synchronizeFinance } from '@/finance/sync';
import { LAUNCH_CHOICE_KEY } from '@/services/launch-routing';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import { setPersistentValue } from '@/services/persistent-storage';
import { signInWithGoogle } from '@/services/google-auth';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';
import { registerBackgroundFinanceSync, unregisterBackgroundFinanceSync } from '@/services/background-sync';

export default function AccountScreen() {
  const params = useLocalSearchParams<{ mode?: string; entry?: string }>();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>(params.mode === 'sign_up' ? 'sign_up' : 'sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState<'auth' | 'sync' | 'signout' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ pendingCount: 0, lastSyncAt: null as string | null });

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => { void loadSyncStatus().then(setStatus).catch(() => undefined); }, [session]);

  async function continueFromWelcome() {
    await setPersistentValue(LAUNCH_CHOICE_KEY, 'account');
    router.replace(await isInitialSetupComplete() ? '/(tabs)' : '/onboarding');
  }

  async function submitAuth() {
    if (!client) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    setWorking('auth'); setError(''); setMessage('');
    try {
      if (mode === 'sign_up') {
        const { data, error: authError } = await client.auth.signUp({ email: normalizedEmail, password });
        if (authError) throw authError;
        if (data.session && params.entry === 'welcome') await continueFromWelcome();
        else if (data.session) setMessage('Account created. Tap Sync now when ready; Hisab will ask before merging local records.');
        else setMessage('Account created. Confirm your email, then sign in and choose Sync now to merge your local records.');
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) throw authError;
        if (params.entry === 'welcome') await continueFromWelcome();
        else setMessage('Signed in. Choose Sync now when you are ready to merge local and cloud changes.');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not complete sign-in.'); }
    finally { setWorking(null); }
  }

  async function submitGoogleAuth() {
    setWorking('auth'); setError(''); setMessage('');
    try {
      const result = await signInWithGoogle();
      if (result === 'signed_in') {
        if (params.entry === 'welcome') await continueFromWelcome();
        else setMessage('Signed in with Google. Choose Sync now when you are ready to merge local and cloud changes.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in with Google.');
    } finally {
      setWorking(null);
    }
  }

  function confirmSync() {
    if (!client || !session) return;
    Alert.alert('Sync this finance data?', 'The first sync merges this device’s guest records into this account. Later syncs merge changes from both places. Create a backup first if you want a separate snapshot.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sync now', onPress: () => { setWorking('sync'); setError(''); setMessage(''); void synchronizeFinance(session.user.id).then(async lastSyncAt => { await loadSyncStatus().then(setStatus); const scheduled = await registerBackgroundFinanceSync(); setMessage(`Sync complete at ${new Date(lastSyncAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}.${scheduled ? ' Background sync is scheduled when the system allows.' : ''}`); }).catch(reason => setError(reason instanceof Error ? reason.message : 'Sync did not finish. Your local records are still saved.')).finally(() => setWorking(null)); } }]);
  }

  async function signOut() {
    if (!client) return;
    setWorking('signout'); setError('');
    try { await unregisterBackgroundFinanceSync(); const { error: authError } = await client.auth.signOut(); if (authError) throw authError; setMessage('Signed out. This device’s finance data remains available locally.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sign out.'); }
    finally { setWorking(null); }
  }

  async function sendRecoveryEmail() {
    if (!client) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError('Enter your account email address first.'); return; }
    setWorking('auth'); setError(''); setMessage('');
    try { const { error: resetError } = await client.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: 'hisab://reset-password' }); if (resetError) throw resetError; setMessage('Password reset link sent. Open it on this device to choose a new password.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send the password reset link.'); }
    finally { setWorking(null); }
  }

  function confirmDeleteAccount() {
    if (!client || !session) return;
    Alert.alert('Delete cloud account?', 'This permanently deletes your Hisab cloud account and synced records. This device’s local ledger stays on this device. Export a backup first if needed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete account', style: 'destructive', onPress: () => {
      setWorking('delete'); setError(''); setMessage('');
      void client.functions.invoke('delete-account', { method: 'POST' }).then(async ({ error: invokeError }) => {
        if (invokeError) throw invokeError;
        await client.auth.signOut(); setMessage('Cloud account deleted. Your local ledger remains on this device.');
      }).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not delete the cloud account.')).finally(() => setWorking(null));
    } }]);
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.title} localized>Cloud account</AppText><View style={{ width: 42 }} /></View>
    <Surface style={styles.hero}><View style={[styles.heroIcon, { backgroundColor: colors.soft }]}><Ionicons name={session ? 'cloud-done-outline' : 'cloud-outline'} size={23} color={palette.blue} /></View><AppText style={styles.heroTitle} localized>{session ? 'Account connected' : 'Keep your data in sync'}</AppText><AppText style={[styles.body, { color: colors.muted }]} localized>{session ? session.user.email : 'Sign in or create an account to sync your offline ledger across devices.'}</AppText></Surface>
    {!isSupabaseConfigured ? <Surface style={styles.config}><Ionicons name="construct-outline" size={19} color={palette.amber} /><View style={{ flex: 1 }}><AppText style={styles.cardTitle} localized>Supabase setup required</AppText><AppText style={[styles.body, { color: colors.muted }]} localized>Set EXPO_PUBLIC_SUPABASE_URL and a publishable key in .env, then restart Expo. Apply the migration in supabase/migrations first.</AppText></View></Surface> : null}
    {session ? <>
      <Surface style={styles.syncCard}><View style={styles.syncHeader}><View><AppText style={styles.cardTitle} localized>Offline sync</AppText><AppText style={[styles.body, { color: colors.muted, marginTop: 4 }]} localized>{`${status.pendingCount} pending local change(s)`}</AppText></View><View style={[styles.statusDot, { backgroundColor: status.pendingCount ? palette.amber : palette.green }]} /></View><AppText style={[styles.body, { color: colors.muted, marginTop: 9 }]} localized>{`Last synced: ${status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') : 'Not yet'}`}</AppText><TouchableOpacity disabled={!!working} accessibilityRole="button" onPress={confirmSync} style={[styles.primary, { opacity: working ? 0.65 : 1 }]}>{working === 'sync' ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="sync-outline" size={18} color="#FFFFFF" /><AppText style={styles.primaryText} localized>Sync now</AppText></>}</TouchableOpacity></Surface>
      <TouchableOpacity disabled={!!working} onPress={() => void signOut()} style={[styles.signOut, { borderColor: colors.border }]}>{working === 'signout' ? <ActivityIndicator color={palette.red} /> : <><Ionicons name="log-out-outline" size={17} color={palette.red} /><AppText style={styles.signOutText} localized>Sign out</AppText></>}</TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={confirmDeleteAccount} style={[styles.signOut, { borderColor: palette.red }]}>{working === 'delete' ? <ActivityIndicator color={palette.red} /> : <><Ionicons name="trash-outline" size={17} color={palette.red} /><AppText style={styles.signOutText} localized>Delete cloud account</AppText></>}</TouchableOpacity>
    </> : isSupabaseConfigured ? <>
      <View style={styles.toggle}><TouchableOpacity onPress={() => { setMode('sign_in'); setError(''); setMessage(''); }} style={[styles.toggleOption, { backgroundColor: mode === 'sign_in' ? colors.soft : 'transparent' }]}><AppText style={{ color: mode === 'sign_in' ? palette.blue : colors.muted, fontWeight: '700', fontSize: 12 }} localized>Sign in</AppText></TouchableOpacity><TouchableOpacity onPress={() => { setMode('sign_up'); setError(''); setMessage(''); }} style={[styles.toggleOption, { backgroundColor: mode === 'sign_up' ? colors.soft : 'transparent' }]}><AppText style={{ color: mode === 'sign_up' ? palette.blue : colors.muted, fontWeight: '700', fontSize: 12 }} localized>Create account</AppText></TouchableOpacity></View>
      <AppText style={[styles.label, { color: colors.muted }]} localized>EMAIL</AppText><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
      <AppText style={[styles.label, { color: colors.muted }]} localized>PASSWORD</AppText><TextInput autoCapitalize="none" autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'} secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
      <TouchableOpacity disabled={!!working} onPress={() => void submitAuth()} style={[styles.primary, { opacity: working ? 0.65 : 1 }]}>{working === 'auth' ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.primaryText} localized>{mode === 'sign_in' ? 'Sign in' : 'Create account'}</AppText>}</TouchableOpacity>
      {mode === 'sign_in' ? <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => void sendRecoveryEmail()} style={{ padding: 13, alignItems: 'center' }}><AppText style={{ color: palette.blue, fontSize: 12, fontWeight: '700' }} localized>Forgot password?</AppText></TouchableOpacity> : null}
      <View style={styles.divider}><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /><AppText style={[styles.dividerText, { color: colors.muted }]} localized>OR</AppText><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /></View>
      <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => void submitGoogleAuth()} style={[styles.google, { borderColor: colors.border, backgroundColor: colors.card, opacity: working ? 0.65 : 1 }]}>{working === 'auth' ? <ActivityIndicator color={palette.blue} /> : <><Ionicons name="logo-google" size={18} color="#4285F4" /><AppText style={[styles.googleText, { color: colors.text }]} localized>Continue with Google</AppText></>}</TouchableOpacity>
    </> : null}
    {message ? <AppText accessibilityRole="alert" style={styles.message} localized>{message}</AppText> : null}{error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
    <Surface style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={18} color={palette.green} /><AppText style={[styles.body, { flex: 1, color: colors.muted }]} localized>Cloud records are scoped to your signed-in user by database row-level security. Sign-out keeps your local ledger. This device will not sync its data to another account.</AppText></Surface>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 19, fontWeight: '700' }, hero: { padding: 19, alignItems: 'center', marginBottom: 16 }, heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, heroTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 }, body: { fontSize: 11, lineHeight: 17 }, config: { padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 15 }, cardTitle: { fontSize: 13, fontWeight: '700' }, syncCard: { padding: 16 }, syncHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statusDot: { width: 9, height: 9, borderRadius: 5 }, primary: { minHeight: 50, marginTop: 16, borderRadius: radius.md, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }, google: { minHeight: 49, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 4 }, googleText: { fontSize: 13, fontWeight: '700' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 }, dividerLine: { flex: 1, height: StyleSheet.hairlineWidth }, dividerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 }, signOut: { minHeight: 45, marginTop: 12, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, signOutText: { color: palette.red, fontWeight: '700', fontSize: 12 }, toggle: { minHeight: 44, borderRadius: radius.sm, flexDirection: 'row', padding: 4, marginTop: 5 }, toggleOption: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 16 }, input: { minHeight: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13, fontSize: 13 }, message: { color: palette.green, fontSize: 12, lineHeight: 18, marginTop: 14 }, error: { color: palette.red, fontSize: 12, lineHeight: 18, marginTop: 14 }, privacy: { padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 20 } });
