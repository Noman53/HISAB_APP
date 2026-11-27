import { Ionicons } from '@expo/vector-icons';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { setPersistentValue } from '@/services/persistent-storage';
import { signInWithGoogle } from '@/services/google-auth';
import { LAUNCH_CHOICE_KEY } from '@/services/launch-routing';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';
import { isInitialSetupComplete } from '@/finance/database';
import { synchronizeFinance } from '@/finance/sync';
import { useFinanceStore } from '@/finance/store';
import { registerBackgroundFinanceSync } from '@/services/background-sync';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [working, setWorking] = useState<'guest' | 'google' | null>(null);
  const [error, setError] = useState('');
  const maxWidth = Math.max(0, Math.min(width - spacing.lg * 2, 440));

  function openAccount(mode: 'sign_in' | 'sign_up') {
    router.push(`/account?entry=welcome&mode=${mode}`);
  }

  async function continueAsGuest() {
    setWorking('guest');
    setError('');
    try {
      await setPersistentValue(LAUNCH_CHOICE_KEY, 'guest');
      router.replace(await isInitialSetupComplete() ? '/(tabs)' : '/onboarding');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not continue as a guest.');
    } finally {
      setWorking(null);
    }
  }

  async function continueWithGoogle() {
    setWorking('google');
    setError('');
    try {
      const result = await signInWithGoogle();
      if (result === 'signed_in') {
        await setPersistentValue(LAUNCH_CHOICE_KEY, 'account');
        const setupComplete = await isInitialSetupComplete();
        const client = getSupabaseClient();
        const { data } = client ? await client.auth.getSession() : { data: { session: null } };
        if (setupComplete && data.session) {
          try { await synchronizeFinance(data.session.user.id); await registerBackgroundFinanceSync(); await useFinanceStore.getState().initialize(); }
          catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sync your data yet.'); }
        }
        router.replace(setupComplete ? '/(tabs)' : '/onboarding');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in with Google.');
    } finally {
      setWorking(null);
    }
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={[styles.content, { paddingVertical: height < 650 ? spacing.md : spacing.xl }]}>
      <View style={[styles.panel, { width: maxWidth }]}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Ionicons name="wallet" size={27} color="#FFFFFF" /></View>
          <AppText style={styles.brandName}>HISAB</AppText>
        </View>
        <AppText style={styles.heading} localized>Welcome to Hisab</AppText>
        <AppText style={[styles.description, { color: colors.muted }]} localized>Manage your money privately. Sign in to sync across devices, or start with a local guest ledger.</AppText>

        {isSupabaseConfigured ? <View style={styles.accountActions}>
          <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => openAccount('sign_up')} style={styles.primary}>
            <AppText style={styles.primaryText} localized>Create account</AppText>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => openAccount('sign_in')} style={[styles.secondary, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <AppText style={[styles.secondaryText, { color: colors.text }]} localized>Sign in</AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => void continueWithGoogle()} style={[styles.google, { borderColor: colors.border, backgroundColor: colors.card, opacity: working ? 0.7 : 1 }]}>
            {working === 'google' ? <ActivityIndicator color={palette.blue} /> : <><Ionicons name="logo-google" size={18} color="#4285F4" /><AppText style={[styles.secondaryText, { color: colors.text }]} localized>Continue with Google</AppText></>}
          </TouchableOpacity>
        </View> : <Surface style={styles.configNotice}>
          <Ionicons name="cloud-offline-outline" size={18} color={palette.amber} />
          <AppText style={[styles.noticeText, { color: colors.muted }]} localized>Online sign-in is unavailable right now. You can still use Hisab as a guest.</AppText>
        </Surface>}

        <View style={styles.separator}><View style={[styles.separatorLine, { backgroundColor: colors.border }]} /><AppText style={[styles.orText, { color: colors.muted }]} localized>OR</AppText><View style={[styles.separatorLine, { backgroundColor: colors.border }]} /></View>

        <TouchableOpacity accessibilityRole="button" disabled={!!working} onPress={() => void continueAsGuest()} style={[styles.guest, { borderColor: colors.border, backgroundColor: colors.card, opacity: working ? 0.7 : 1 }]}>
          {working === 'guest' ? <ActivityIndicator color={palette.blue} /> : <><Ionicons name="phone-portrait-outline" size={18} color={palette.blue} /><AppText style={[styles.guestText, { color: colors.text }]} localized>Continue as guest</AppText></>}
        </TouchableOpacity>

        {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
        <Surface style={styles.privacy}>
          <Ionicons name="shield-checkmark-outline" size={18} color={palette.green} />
          <AppText style={[styles.privacyText, { color: colors.muted }]} localized>Your records stay on this device unless you choose to sync them.</AppText>
        </Surface>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  panel: { maxWidth: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  brandIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  brandName: { color: palette.blue, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  heading: { fontSize: 29, fontWeight: '700', letterSpacing: -0.5 },
  description: { fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 25 },
  accountActions: { gap: 10 },
  primary: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.blue, borderRadius: radius.md, paddingHorizontal: 16 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16 },
  secondaryText: { fontSize: 13, fontWeight: '700' },
  google: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16 },
  configNotice: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  guest: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16 },
  guestText: { fontSize: 13, fontWeight: '700' },
  error: { color: palette.red, fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  privacy: { marginTop: 20, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
