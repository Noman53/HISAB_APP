import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedSwitch as Switch, LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import * as Network from 'expo-network';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { Surface } from '@/components/Surface';
import { isInitialSetupComplete, loadSyncStatus, setAutoSyncEnabled } from '@/finance/database';
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
  const [working, setWorking] = useState<'email' | 'google' | 'recovery' | 'sync' | 'auto-sync' | 'signout' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ pendingCount: 0, lastSyncAt: null as string | null, syncLinked: false, autoSyncEnabled: false, autoSyncError: false });

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => { void loadSyncStatus(session?.user.id).then(setStatus).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load sync status.')); }, [session]);

  async function continueFromWelcome() {
    await setPersistentValue(LAUNCH_CHOICE_KEY, 'account');
    router.replace(await isInitialSetupComplete() ? '/(tabs)' : '/onboarding');
  }

  async function submitAuth() {
    if (!client) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    setWorking('email'); setError(''); setMessage('');
    try {
      if (mode === 'sign_up') {
        const { data, error: authError } = await client.auth.signUp({ email: normalizedEmail, password });
        if (authError) throw authError;
        if (data.session && params.entry === 'welcome') await continueFromWelcome();
        else if (data.session) setMessage('Account created and signed in.');
        else setMessage('Account created, but email confirmation is still enabled. Turn it off in your Supabase Auth settings to sign in right away.');
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) throw authError;
        if (params.entry === 'welcome') await continueFromWelcome();
        else setMessage('Signed in successfully.');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not complete sign-in.'); }
    finally { setWorking(null); }
  }

  async function submitGoogleAuth() {
    setWorking('google'); setError(''); setMessage('');
    try {
      const result = await signInWithGoogle();
      if (result === 'signed_in') {
        if (params.entry === 'welcome') await continueFromWelcome();
        else setMessage('Signed in with Google.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in with Google.');
    } finally {
      setWorking(null);
    }
  }

  async function syncNow() {
    if (!session) return;
    setWorking('sync'); setError(''); setMessage('');
    try {
      const lastSyncAt = await synchronizeFinance(session.user.id);
      const nextStatus = await loadSyncStatus(session.user.id);
      setStatus(nextStatus);
      const scheduled = nextStatus.autoSyncEnabled ? await registerBackgroundFinanceSync() : false;
      setMessage(`Sync complete at ${new Date(lastSyncAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}.${scheduled ? ' Background sync is scheduled when the system allows.' : ''}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sync did not finish. Your local records are still saved.');
    } finally {
      setWorking(null);
    }
  }

  function confirmSync() {
    if (!client || !session) return;
    if (status.lastSyncAt) { void syncNow(); return; }
    Alert.alert('Sync this finance data?', 'The first sync adds this device’s records to your account. Later syncs keep both up to date. Create a backup first if you want a separate copy.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sync now', onPress: () => void syncNow() }]);
  }

  async function updateAutoSync(enabled: boolean) {
    if (!session) return;
    setWorking('auto-sync'); setError(''); setMessage('');
    try {
      await setAutoSyncEnabled(session.user.id, enabled);
      if (enabled) {
        await registerBackgroundFinanceSync();
        const network = await Network.getNetworkStateAsync();
        if (network.isConnected === true && network.isInternetReachable !== false) await synchronizeFinance(session.user.id);
        setMessage('Automatic sync is on.');
      } else {
        await unregisterBackgroundFinanceSync();
        setMessage('Automatic sync is off. You can still sync whenever you want.');
      }
      setStatus(await loadSyncStatus(session.user.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update automatic sync.');
      setStatus(await loadSyncStatus(session.user.id));
    } finally {
      setWorking(null);
    }
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
    setWorking('recovery'); setError(''); setMessage('');
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
    <Surface style={styles.hero}><View style={[styles.heroIcon, { backgroundColor: colors.soft }]}><Ionicons name={session ? 'cloud-done-outline' : 'cloud-outline'} size={23} color={palette.blue} /></View><AppText style={styles.heroTitle} localized>{session ? 'Account connected' : 'Keep your data in sync'}</AppText><AppText style={[styles.body, { color: colors.muted }]} localized>{session ? session.user.email : 'Sign in or create an account to sync your data across devices.'}</AppText></Surface>
    {!isSupabaseConfigured ? <Surface style={styles.config}><Ionicons name="cloud-offline-outline" size={19} color={palette.amber} /><AppText style={[styles.body, { color: colors.muted, flex: 1 }]} localized>Cloud sync is not available right now. You can keep using Hisab on this device.</AppText></Surface> : null}
    {session ? <>
      <Surface style={styles.syncCard}><View style={styles.syncHeader}><View><AppText style={styles.cardTitle} localized>Cloud sync</AppText><AppText style={[styles.body, { color: colors.muted, marginTop: 4 }]} localized>{`${status.pendingCount} pending local change(s)`}</AppText></View><View style={[styles.statusDot, { backgroundColor: status.pendingCount || status.autoSyncError ? palette.amber : palette.green }]} /></View><AppText style={[styles.body, { color: colors.muted, marginTop: 9 }]} localized>{`Last synced: ${status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') : 'Not yet'}`}</AppText><View style={[styles.autoSyncRow, { borderTopColor: colors.border }]}><View style={{ flex: 1 }}><AppText style={styles.autoSyncTitle} localized>Automatic sync</AppText><AppText style={[styles.body, { color: colors.muted }]} localized>{status.syncLinked && status.lastSyncAt ? 'Keep this device up to date when you make changes.' : status.lastSyncAt && !status.syncLinked ? 'This device is linked to a different account.' : 'Sync once to turn on automatic sync.'}</AppText></View><Switch accessibilityLabel="Automatic sync" value={status.autoSyncEnabled} disabled={!!working || !status.syncLinked || !status.lastSyncAt} onValueChange={value => void updateAutoSync(value)} trackColor={{ true: palette.blue }} /></View>{status.autoSyncError ? <AppText accessibilityRole="alert" style={styles.syncWarning} localized>Automatic sync could not finish. Tap Sync now to try again.</AppText> : null}<TouchableOpacity disabled={!!working} accessibilityRole="button" onPress={confirmSync} style={[styles.primary, { opacity: working ? 0.65 : 1 }]}>{working === 'sync' ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="sync-outline" size={18} color="#FFFFFF" /><AppText style={styles.primaryText} localized>Sync now</AppText></>}</TouchableOpacity></Surface>
      <TouchableOpacity disabled={!!working} onPress={() => void signOut()} style={[styles.signOut, { borderColor: colors.border }]}>{working === 'signout' ? <ActivityIndicator color={palette.red} /> : <><Ionicons name="log-out-outline" size={17} color={palette.red} /><AppText style={styles.signOutText} localized>Sign out</AppText></>}</TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={confirmDeleteAccount} style={[styles.signOut, { borderColor: palette.red }]}>{working === 'delete' ? <ActivityIndicator color={palette.red} /> : <><Ionicons name="trash-outline" size={17} color={palette.red} /><AppText style={styles.signOutText} localized>Delete cloud account</AppText></>}</TouchableOpacity>
    </> : isSupabaseConfigured ? <>
      <View style={styles.toggle}><TouchableOpacity onPress={() => { setMode('sign_in'); setError(''); setMessage(''); }} style={[styles.toggleOption, { backgroundColor: mode === 'sign_in' ? colors.soft : 'transparent' }]}><AppText style={{ color: mode === 'sign_in' ? palette.blue : colors.muted, fontWeight: '700', fontSize: 12 }} localized>Sign in</AppText></TouchableOpacity><TouchableOpacity onPress={() => { setMode('sign_up'); setError(''); setMessage(''); }} style={[styles.toggleOption, { backgroundColor: mode === 'sign_up' ? colors.soft : 'transparent' }]}><AppText style={{ color: mode === 'sign_up' ? palette.blue : colors.muted, fontWeight: '700', fontSize: 12 }} localized>Create account</AppText></TouchableOpacity></View>
      <AppText style={[styles.label, { color: colors.muted }]} localized>EMAIL</AppText><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
      <AppText style={[styles.label, { color: colors.muted }]} localized>PASSWORD</AppText><TextInput autoCapitalize="none" autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'} secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
      <TouchableOpacity disabled={!!working} onPress={() => void submitAuth()} style={[styles.primary, { opacity: working ? 0.65 : 1 }]}>{working === 'email' ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.primaryText} localized>{mode === 'sign_in' ? 'Sign in' : 'Create account'}</AppText>}</TouchableOpacity>
      {mode === 'sign_in' ? <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => void sendRecoveryEmail()} style={{ padding: 13, alignItems: 'center' }}>{working === 'recovery' ? <ActivityIndicator color={palette.blue} /> : <AppText style={{ color: palette.blue, fontSize: 12, fontWeight: '700' }} localized>Forgot password?</AppText>}</TouchableOpacity> : null}
      <View style={styles.divider}><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /><AppText style={[styles.dividerText, { color: colors.muted }]} localized>OR</AppText><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /></View>
      <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => void submitGoogleAuth()} style={[styles.google, { borderColor: colors.border, backgroundColor: colors.card, opacity: working ? 0.65 : 1 }]}>{working === 'google' ? <ActivityIndicator color={palette.blue} /> : <><Ionicons name="logo-google" size={18} color="#4285F4" /><AppText style={[styles.googleText, { color: colors.text }]} localized>Continue with Google</AppText></>}</TouchableOpacity>
    </> : null}
    {message ? <AppText accessibilityRole="alert" style={styles.message} localized>{message}</AppText> : null}{error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 19, fontWeight: '700' }, hero: { padding: 19, alignItems: 'center', marginBottom: 16 }, heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, heroTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 }, body: { fontSize: 11, lineHeight: 17 }, config: { padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 15 }, cardTitle: { fontSize: 13, fontWeight: '700' }, syncCard: { padding: 16 }, syncHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statusDot: { width: 9, height: 9, borderRadius: 5 }, autoSyncRow: { minHeight: 60, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 13, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, autoSyncTitle: { fontSize: 12, fontWeight: '700', marginBottom: 3 }, syncWarning: { color: palette.amber, fontSize: 11, lineHeight: 16, marginTop: 8 }, primary: { minHeight: 50, marginTop: 16, borderRadius: radius.md, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }, google: { minHeight: 49, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 4 }, googleText: { fontSize: 13, fontWeight: '700' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 }, dividerLine: { flex: 1, height: StyleSheet.hairlineWidth }, dividerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 }, signOut: { minHeight: 45, marginTop: 12, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, signOutText: { color: palette.red, fontWeight: '700', fontSize: 12 }, toggle: { minHeight: 44, borderRadius: radius.sm, flexDirection: 'row', padding: 4, marginTop: 5 }, toggleOption: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 16 }, input: { minHeight: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13, fontSize: 13 }, message: { color: palette.green, fontSize: 12, lineHeight: 18, marginTop: 14 }, error: { color: palette.red, fontSize: 12, lineHeight: 18, marginTop: 14 } });
