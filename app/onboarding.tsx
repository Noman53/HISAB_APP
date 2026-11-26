import { Ionicons } from '@expo/vector-icons';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { completeInitialSetup } from '@/finance/database';
import { useFinanceStore } from '@/finance/store';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';
import { getSupabaseClient } from '@/services/supabase';

const currencies = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'SGD', 'PKR', 'AED', 'SAR', 'CNY', 'CHF'];
const slides = [
  { icon: 'shield-checkmark-outline' as const, eyebrow: 'PRIVATE BY DEFAULT', title: 'Your money, your control', description: 'Start with a private ledger on this device. Your records stay here unless you choose to connect cloud sync.' },
  { icon: 'pie-chart-outline' as const, eyebrow: 'SEE THE FULL PICTURE', title: 'Track and plan ahead', description: 'Record income, expenses, and transfers, then organize your money with budgets, savings goals, and debt tracking.' },
  { icon: 'cloud-offline-outline' as const, eyebrow: 'READY WHEN YOU ARE', title: 'Works offline, too', description: 'Keep using Hisab without an internet connection. You can set up an account and sync later if you want.' },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { translate } = useLanguage();
  const [currency, setCurrency] = useState('BDT');
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const client = getSupabaseClient();
  const choosingCurrency = step === slides.length;
  const slide = slides[Math.min(step, slides.length - 1)];

  useEffect(() => {
    if (!client) { setAuthReady(true); return; }
    let active = true;
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) throw sessionError;
      if (active) setAuthenticated(Boolean(data.session));
    }).catch(reason => {
      if (active) setError(translate(reason instanceof Error ? reason.message : 'Could not load your account.'));
    }).finally(() => { if (active) setAuthReady(true); });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthenticated(Boolean(session));
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [client, translate]);

  async function startUsingHisab() {
    setWorking(true);
    setError('');
    try {
      await completeInitialSetup(currency);
      await useFinanceStore.getState().initialize();
      router.replace('/(tabs)');
    } catch (reason) {
      setError(translate(reason instanceof Error ? reason.message : 'Could not finish setup.'));
    } finally {
      setWorking(false);
    }
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: slides.length + 1, now: step + 1 }}>
        {Array.from({ length: slides.length + 1 }, (_, index) => <View key={index} style={[styles.progressDot, { backgroundColor: index === step ? palette.blue : colors.border }]} />)}
      </View>
      {!choosingCurrency ? <>
        <View style={styles.brandIcon}><Ionicons name={slide.icon} size={29} color="#FFFFFF" /></View>
        <AppText style={[styles.eyebrow, { color: colors.muted }]}>{translate(slide.eyebrow)}</AppText>
        <AppText style={styles.heading}>{translate(slide.title)}</AppText>
        <AppText style={[styles.description, { color: colors.muted }]}>{translate(slide.description)}</AppText>
        <Surface style={styles.privacyCard}><Ionicons name="lock-closed-outline" size={18} color={palette.blue} /><AppText style={[styles.privacyCardText, { color: colors.muted }]} localized>No account is needed to get started.</AppText></Surface>
      </> : <>
        <View style={styles.brandIcon}><Ionicons name="wallet" size={29} color="#FFFFFF" /></View>
        <AppText style={[styles.eyebrow, { color: colors.muted }]} localized>PERSONAL FINANCE, MADE CLEAR</AppText>
        <AppText style={styles.heading} localized>Choose your currency</AppText>
        <AppText style={[styles.description, { color: colors.muted }]} localized>Pick the currency for your starting wallet. You can add wallets in other currencies later.</AppText>
        <Surface style={styles.currencyCard}>
          <AppText style={styles.cardTitle} localized>Starting currency</AppText>
          <View style={styles.currencyGrid}>{currencies.map(code => (
            <TouchableOpacity
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: currency === code }}
              onPress={() => setCurrency(code)}
              style={[styles.currencyOption, { backgroundColor: currency === code ? colors.soft : colors.card, borderColor: currency === code ? palette.blue : colors.border }]}
            >
              <AppText style={{ color: currency === code ? palette.blue : colors.text, fontSize: 13, fontWeight: '700' }}>{code}</AppText>
            </TouchableOpacity>
          ))}</View>
        </Surface>
      </>}

      {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
      <View style={styles.actions}>
        {step > 0 ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous onboarding step" onPress={() => setStep(step - 1)} style={[styles.secondary, { borderColor: colors.border }]}><Ionicons name="arrow-back" size={18} color={colors.text} /></TouchableOpacity> : null}
        <TouchableOpacity accessibilityRole="button" disabled={working || (choosingCurrency && !authReady)} onPress={() => choosingCurrency ? void startUsingHisab() : setStep(step + 1)} style={[styles.primary, styles.actionPrimary, { opacity: working || (choosingCurrency && !authReady) ? 0.7 : 1 }]}>
          {working ? <ActivityIndicator color="#FFFFFF" /> : <><AppText style={styles.primaryText}>{translate(choosingCurrency ? authenticated ? 'Continue' : 'Continue as guest' : step === slides.length - 1 ? 'Choose currency' : 'Next')}</AppText><Ionicons name={choosingCurrency ? 'checkmark' : 'arrow-forward'} size={18} color="#FFFFFF" /></>}
        </TouchableOpacity>
      </View>
      {!choosingCurrency ? <TouchableOpacity accessibilityRole="button" onPress={() => setStep(slides.length)} style={styles.skip}><AppText style={[styles.skipText, { color: colors.muted }]} localized>Skip introduction</AppText></TouchableOpacity> : <AppText style={[styles.privacy, { color: colors.muted }]} localized>Your records stay on this device unless you choose to sync them.</AppText>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingBottom: 36 },
  progress: { flexDirection: 'row', gap: 7, marginBottom: 33 },
  progressDot: { flex: 1, height: 4, borderRadius: radius.pill },
  brandIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: palette.blue, marginBottom: 27 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  heading: { fontSize: 30, fontWeight: '700', letterSpacing: -0.7, marginTop: 8 },
  description: { fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 },
  privacyCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 24 },
  privacyCardText: { flex: 1, fontSize: 12, lineHeight: 18 },
  currencyCard: { padding: 17 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  helper: { fontSize: 11, marginTop: 5, marginBottom: 15 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyOption: { minWidth: 68, minHeight: 42, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  error: { color: palette.red, fontSize: 12, lineHeight: 18, marginTop: 13 },
  primary: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: palette.blue, borderRadius: radius.md, marginTop: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionPrimary: { flex: 1, marginTop: 0 },
  secondary: { width: 54, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  skip: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  skipText: { fontSize: 12, fontWeight: '600' },
  privacy: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 14 },
});
