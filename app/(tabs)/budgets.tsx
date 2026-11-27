import { Ionicons } from '@expo/vector-icons';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

type PlanningRoute = '/planning/budget' | '/planning/savings' | '/planning/debts' | '/planning/recurring' | '/planning/bills';

const tools: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; route: PlanningRoute }[] = [
  { title: 'Budgets', detail: 'Set weekly or monthly spending limits.', icon: 'pie-chart-outline', route: '/planning/budget' },
  { title: 'Savings goals', detail: 'Track progress toward the things you are saving for.', icon: 'flag-outline', route: '/planning/savings' },
  { title: 'Debt manager', detail: 'Keep track of money you owe or are owed.', icon: 'people-outline', route: '/planning/debts' },
  { title: 'Recurring entries', detail: 'Review regular income and expenses before adding them.', icon: 'repeat-outline', route: '/planning/recurring' },
  { title: 'Bill reminders', detail: 'Keep upcoming payments and due dates in one place.', icon: 'receipt-outline', route: '/planning/bills' },
];

export default function PlanningScreen() {
  const { colors } = useTheme();
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <AppText style={[styles.eyebrow, { color: colors.muted }]} localized>PLAN AHEAD</AppText>
      <AppText style={styles.heading} localized>Plan your money</AppText>
      <AppText style={[styles.intro, { color: colors.muted }]} localized>Budgets, savings and upcoming payments — all together.</AppText>
      <View style={styles.list}>{tools.map(tool => <TouchableOpacity key={tool.route} accessibilityRole="button" onPress={() => router.push(tool.route)}>
        <Surface style={styles.item}>
          <View style={[styles.icon, { backgroundColor: colors.soft }]}><Ionicons name={tool.icon} size={20} color={palette.blue} /></View>
          <View style={styles.copy}><AppText style={styles.title} localized>{tool.title}</AppText><AppText style={[styles.detail, { color: colors.muted }]} localized>{tool.detail}</AppText></View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Surface>
      </TouchableOpacity>)}</View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingTop: 24, paddingBottom: 32 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  heading: { fontSize: 25, fontWeight: '700', marginTop: 5 },
  intro: { fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 21 },
  list: { gap: 10 },
  item: { minHeight: 76, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 13, fontWeight: '700' },
  detail: { fontSize: 11, lineHeight: 16 },
});
