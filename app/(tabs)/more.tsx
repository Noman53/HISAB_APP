import { Ionicons } from '@expo/vector-icons';
import { LocalizedSwitch as Switch, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { useFinanceStore } from '@/finance/store';
import { useAppLock } from '@/security/AppLockProvider';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing, ThemeMode } from '@/theme/tokens';

const modes: ThemeMode[] = ['system', 'light', 'dark'];

export default function More() {
  const { colors, mode, setMode, preferenceError } = useTheme();
  const data = useFinanceStore(state => state.data);
  const { enabled: appLockEnabled, supported: appLockSupported, updating: appLockUpdating, error: appLockError, setEnabled: setAppLockEnabled } = useAppLock();
  const { translate } = useLanguage();

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <AppText style={[styles.eyebrow, { color: colors.muted }]} localized>HISAB</AppText>
      <AppText style={styles.heading} localized>More</AppText>
      <Surface style={styles.guestCard}>
        <View style={styles.guestIcon}><Ionicons name="phone-portrait-outline" size={20} color={palette.blue} /></View>
        <View style={{ flex: 1 }}><AppText style={styles.cardTitle} localized>Local-first ledger</AppText><AppText style={[styles.body, { color: colors.muted }]} localized>Your finance data stays available on this device, online or offline.</AppText></View>
        <View style={styles.badge}><AppText style={styles.badgeText} localized>LOCAL</AppText></View>
      </Surface>

      <AppText style={styles.sectionTitle} localized>Appearance</AppText>
      <Surface style={styles.themeCard}>
        <AppText style={[styles.body, { color: colors.muted, marginBottom: 12 }]} localized>Choose the appearance used by Hisab.</AppText>
        <View style={styles.modes}>{modes.map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => { void setMode(value); }} style={[styles.mode, { backgroundColor: mode === value ? palette.blue : colors.background, borderColor: mode === value ? palette.blue : colors.border }]}><AppText style={{ color: mode === value ? '#FFFFFF' : colors.text, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }}>{translate(value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark')}</AppText></TouchableOpacity>)}</View>
        {preferenceError ? <AppText accessibilityRole="alert" style={styles.preferenceError} localized>{preferenceError}</AppText> : null}
      </Surface>

      <AppText style={styles.sectionTitle} localized>Local account</AppText>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/settings')}><Surface style={styles.item}><Ionicons name="person-circle-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Profile & privacy</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/wallets')}><Surface style={styles.item}><Ionicons name="wallet-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Manage wallets</AppText><AppText style={[styles.itemValue, { color: colors.muted }]}>{data?.wallets.length ?? '—'}</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <Surface style={styles.item}><Ionicons name="cash-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Primary wallet currency</AppText><AppText style={[styles.itemValue, { color: colors.muted }]}>{data?.currency ?? '—'}</AppText></Surface>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/currency-rates')}><Surface style={styles.item}><Ionicons name="swap-horizontal-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Portfolio currency & rates</AppText><AppText style={[styles.itemValue, { color: colors.muted }]}>{data?.baseCurrency ?? '—'}</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <Surface style={styles.item}>
        <Ionicons name="lock-closed-outline" size={19} color={palette.blue} />
        <View style={styles.lockCopy}><AppText style={styles.itemLabel} localized>App lock</AppText><AppText style={[styles.lockHint, { color: colors.muted }]} localized>{appLockSupported ? 'Biometrics with device passcode fallback' : 'App lock is available only in the mobile app.'}</AppText></View>
        {appLockSupported ? <Switch accessibilityLabel={translate('App lock')} value={appLockEnabled} disabled={appLockUpdating} onValueChange={value => void setAppLockEnabled(value)} trackColor={{ true: palette.blue }} /> : null}
      </Surface>
      {appLockError ? <AppText accessibilityRole="alert" style={styles.preferenceError} localized>{appLockError}</AppText> : null}

      <AppText style={styles.sectionTitle} localized>Planning</AppText>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/notifications')}><Surface style={styles.item}><Ionicons name="notifications-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Notification preferences</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/planning/savings')}><Surface style={styles.item}><Ionicons name="flag-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Savings goals</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/planning/debts')}><Surface style={styles.item}><Ionicons name="people-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Debt manager</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/planning/recurring')}><Surface style={styles.item}><Ionicons name="repeat-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Recurring entries</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/planning/bills')}><Surface style={styles.item}><Ionicons name="receipt-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Bill reminders</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>

      <AppText style={styles.sectionTitle} localized>Data & cloud</AppText>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/account')}><Surface style={styles.item}><Ionicons name="cloud-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Cloud account & sync</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/backup')}><Surface style={styles.item}><Ionicons name="cloud-download-outline" size={19} color={palette.blue} /><AppText style={styles.itemLabel} localized>Backup & restore</AppText><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Surface></TouchableOpacity>
      <AppText style={[styles.footnote, { color: colors.muted }]} localized>App lock gates access but does not encrypt local data. Cloud accounts and sync require a configured Supabase project.</AppText>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingTop: 24, gap: 10 },
  eyebrow: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700' },
  heading: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  guestCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  guestIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB15' },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  body: { fontSize: 11, lineHeight: 16 },
  badge: { borderRadius: radius.pill, backgroundColor: '#2563EB14', paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: palette.blue, fontSize: 9, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 2 },
  themeCard: { padding: 15 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderRadius: radius.sm },
  preferenceError: { color: palette.red, fontSize: 11, lineHeight: 16, marginTop: 10 },
  item: { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  itemValue: { fontSize: 12 },
  lockCopy: { flex: 1 },
  lockHint: { fontSize: 10, marginTop: 3 },
  footnote: { fontSize: 11, lineHeight: 17, marginTop: 12, textAlign: 'center' },
});
