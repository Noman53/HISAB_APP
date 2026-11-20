import { Ionicons } from '@expo/vector-icons';
import { LocalizedSwitch as Switch, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { loadPlanningNotificationPreferences, PlanningNotificationKey, PlanningNotificationPreferences } from '@/finance/database';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, spacing } from '@/theme/tokens';
import { refreshPlanningNotifications, updatePlanningNotificationPreference } from '@/services/planning-notifications';

const options: Array<{ key: PlanningNotificationKey; title: string; description: string }> = [
  { key: 'recurring', title: 'Recurring entries', description: 'A reminder at 9:00 AM on the next scheduled date. Entries are never posted automatically.' },
  { key: 'savings', title: 'Savings milestones', description: 'An alert when a contribution reaches 50%, 75%, or 100% of a goal, once per milestone.' },
  { key: 'debts', title: 'Debt due dates', description: 'A reminder at 9:00 AM on the due date while an amount remains outstanding.' },
  { key: 'weeklySummary', title: 'Weekly summary', description: 'A Monday 9:00 AM reminder to review last week’s income, spending, and cash flow.' },
];

const emptyPreferences: PlanningNotificationPreferences = { recurring: false, savings: false, debts: false, weeklySummary: false };

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const [preferences, setPreferences] = useState(emptyPreferences);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<PlanningNotificationKey | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    void loadPlanningNotificationPreferences()
      .then(async saved => { if (active) setPreferences(saved); await refreshPlanningNotifications(); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load notification settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  async function toggle(key: PlanningNotificationKey, enabled: boolean) {
    setWorking(key);
    setError('');
    setMessage('');
    try {
      await updatePlanningNotificationPreference(key, enabled);
      setPreferences(current => ({ ...current, [key]: enabled }));
      const title = options.find(option => option.key === key)?.title ?? 'Notification preference';
      setMessage(`${title} ${enabled ? 'enabled' : 'turned off'}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update notification settings.');
    } finally {
      setWorking(null);
    }
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <AppText style={styles.heading} localized>Notifications</AppText>
        <View style={{ width: 42 }} />
      </View>
      <Surface style={styles.notice}>
        <Ionicons name="notifications-outline" size={19} color={palette.blue} />
        <AppText style={[styles.description, { color: colors.muted }]} localized>All planning notifications are optional and stay on this device. Due-date reminders look ahead 90 days and schedule the 12 nearest items; your operating system may delay delivery.</AppText>
      </Surface>
      {options.map(option => <Surface key={option.key} style={styles.preference}>
        <View style={styles.copy}>
          <AppText style={styles.title} localized>{option.title}</AppText>
          <AppText style={[styles.description, { color: colors.muted }]} localized>{option.description}</AppText>
        </View>
        <Switch
          accessibilityLabel={option.title}
          value={preferences[option.key]}
          disabled={loading || working !== null}
          onValueChange={value => void toggle(option.key, value)}
          trackColor={{ true: palette.blue }}
        />
      </Surface>)}
      {loading ? <AppText style={[styles.status, { color: colors.muted }]} localized>Loading notification settings…</AppText> : null}
      {message ? <AppText accessibilityRole="alert" style={styles.success} localized>{message}</AppText> : null}
      {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
      <AppText style={[styles.footnote, { color: colors.muted }]} localized>Bill reminders and budget alerts have their own controls in Planning.</AppText>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 36, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 19, fontWeight: '700' },
  notice: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  preference: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 13, fontWeight: '700' },
  description: { fontSize: 11, lineHeight: 17 },
  status: { fontSize: 11, textAlign: 'center', padding: 10 },
  success: { color: palette.green, fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { color: palette.red, fontSize: 12, lineHeight: 18, marginTop: 4 },
  footnote: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 10 },
});
