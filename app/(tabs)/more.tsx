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
type SettingsRoute = '/settings' | '/wallets' | '/currency-rates' | '/notifications' | '/account' | '/backup';

function SettingsRow({ icon, title, route, value }: { icon: keyof typeof Ionicons.glyphMap; title: string; route: SettingsRoute; value?: string | number }) {
  const { colors } = useTheme();
  return <TouchableOpacity accessibilityRole="button" onPress={() => router.push(route)}>
    <Surface style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.soft }]}><Ionicons name={icon} size={19} color={palette.blue} /></View>
      <AppText style={styles.rowTitle} localized>{title}</AppText>
      {value !== undefined ? <AppText style={[styles.value, { color: colors.muted }]}>{value}</AppText> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Surface>
  </TouchableOpacity>;
}

export default function SettingsHome() {
  const { colors, mode, setMode, preferenceError } = useTheme();
  const data = useFinanceStore(state => state.data);
  const { enabled, supported, updating, error, setEnabled } = useAppLock();
  const { language, setLanguage, translate, error: languageError } = useLanguage();

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <AppText style={[styles.eyebrow, { color: colors.muted }]} localized>HISAB</AppText>
      <AppText style={styles.heading} localized>Settings</AppText>

      <AppText style={styles.sectionTitle} localized>App settings</AppText>
      <Surface style={styles.preferences}>
        <View style={styles.preferenceBlock}>
          <AppText style={styles.preferenceTitle} localized>Language</AppText>
          <View style={styles.choiceRow}>{(['en', 'bn'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: language === value }} onPress={() => void setLanguage(value)} style={[styles.choice, { backgroundColor: language === value ? palette.blue : colors.background, borderColor: language === value ? palette.blue : colors.border }]}><AppText style={[styles.choiceText, { color: language === value ? '#FFFFFF' : colors.text }]}>{translate(value === 'en' ? 'English' : 'Bangla')}</AppText></TouchableOpacity>)}</View>
          {languageError ? <AppText accessibilityRole="alert" style={styles.error} localized>{languageError}</AppText> : null}
        </View>
        <View style={[styles.preferenceBlock, { borderTopColor: colors.border }]}>
          <AppText style={styles.preferenceTitle} localized>Appearance</AppText>
          <View style={styles.choiceRow}>{modes.map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => void setMode(value)} style={[styles.choice, { backgroundColor: mode === value ? palette.blue : colors.background, borderColor: mode === value ? palette.blue : colors.border }]}><AppText style={[styles.choiceText, { color: mode === value ? '#FFFFFF' : colors.text }]} localized>{value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}</AppText></TouchableOpacity>)}</View>
          {preferenceError ? <AppText accessibilityRole="alert" style={styles.error} localized>{preferenceError}</AppText> : null}
        </View>
        <View style={[styles.lockRow, { borderTopColor: colors.border }]}>
          <View style={[styles.rowIcon, { backgroundColor: colors.soft }]}><Ionicons name="lock-closed-outline" size={19} color={palette.blue} /></View>
          <View style={styles.lockCopy}><AppText style={styles.rowTitle} localized>App lock</AppText><AppText style={[styles.helper, { color: colors.muted }]} localized>{supported ? 'Use your fingerprint or phone lock.' : 'App lock is available only in the mobile app.'}</AppText></View>
          {supported ? <Switch accessibilityLabel={translate('App lock')} value={enabled} disabled={updating} onValueChange={value => void setEnabled(value)} trackColor={{ true: palette.blue }} /> : null}
        </View>
        {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
      </Surface>

      <AppText style={styles.sectionTitle} localized>Profile & wallets</AppText>
      <SettingsRow icon="person-circle-outline" title="Profile" route="/settings" />
      <SettingsRow icon="wallet-outline" title="Manage wallets" route="/wallets" value={data?.wallets.length ?? 0} />
      <SettingsRow icon="swap-horizontal-outline" title="Portfolio currency & rates" route="/currency-rates" value={data?.baseCurrency ?? '—'} />

      <AppText style={styles.sectionTitle} localized>Data & backup</AppText>
      <SettingsRow icon="cloud-outline" title="Cloud account & sync" route="/account" />
      <SettingsRow icon="cloud-download-outline" title="Backup & restore" route="/backup" />

      <AppText style={styles.sectionTitle} localized>Reminders</AppText>
      <SettingsRow icon="notifications-outline" title="Notification preferences" route="/notifications" />
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingTop: 24, paddingBottom: 34, gap: 9 },
  eyebrow: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700' },
  heading: { fontSize: 27, fontWeight: '700', marginBottom: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 13, marginBottom: 1 },
  preferences: { paddingHorizontal: 14 },
  preferenceBlock: { paddingVertical: 13 },
  preferenceTitle: { fontSize: 12, fontWeight: '600', marginBottom: 9 },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: 39, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 11, fontWeight: '600' },
  lockRow: { minHeight: 66, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockCopy: { flex: 1 },
  helper: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  error: { color: palette.red, fontSize: 11, lineHeight: 16, paddingBottom: 8 },
  row: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 12, fontWeight: '600' },
  value: { fontSize: 11 },
});
