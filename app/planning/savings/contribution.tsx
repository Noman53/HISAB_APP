import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { DatePickerField } from '@/components/DatePickerField';
import { useTheme } from '@/theme/ThemeProvider';
import { GoalContributionInput, loadSavingsGoals, SavingsGoal, recordGoalContribution } from '@/finance/database';
import { parseAmountToMinor } from '@/finance/money';
import { palette, radius, spacing } from '@/theme/tokens';
import { notifySavingsMilestones } from '@/services/planning-notifications';

function today() { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
export default function SavingsContribution() {
  const { goalId, kind } = useLocalSearchParams<{ goalId: string; kind: 'add' | 'withdraw' }>(); const { colors } = useTheme();
  const [goal, setGoal] = useState<SavingsGoal | null>(null); const [amount, setAmount] = useState(''); const [date, setDate] = useState(today()); const [note, setNote] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { void loadSavingsGoals().then(items => setGoal(items.find(item => item.id === goalId) ?? null)).catch(() => setError('Could not load this goal.')); }, [goalId]);
  async function submit() { setError(''); if (!goal) { setError('Savings goal not found.'); return; } let amountMinor: number; try { amountMinor = parseAmountToMinor(amount, goal.currency); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Enter a valid amount.'); return; } setSaving(true); try { await recordGoalContribution({ goalId, kind: kind === 'withdraw' ? 'withdraw' : 'add', amountMinor, occurredAt: date, note } as GoalContributionInput); if (kind !== 'withdraw') { try { const updated = (await loadSavingsGoals()).find(item => item.id === goal.id); if (updated) await notifySavingsMilestones(goal.id, goal.name, goal.percentComplete, updated.percentComplete); } catch (reason) { Alert.alert('Contribution saved', `The contribution was saved, but its milestone notification could not be sent. ${reason instanceof Error ? reason.message : ''}`); } } router.back(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not record this contribution.'); } finally { setSaving(false); } }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>{kind === 'withdraw' ? 'Withdraw from goal' : 'Add contribution'}</AppText><View style={{ width: 42 }} /></View>
    <AppText style={[styles.label, { color: colors.muted }]}>{goal?.name ?? 'SAVINGS GOAL'}</AppText><TextInput accessibilityLabel="Contribution amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder={`Amount in ${goal?.currency ?? 'currency'}`} placeholderTextColor={colors.muted} style={[styles.input, styles.amount, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <AppText style={[styles.label, { color: colors.muted }]} localized>DATE</AppText><DatePickerField accessibilityLabel="Date" value={date} onChange={setDate} />
    <AppText style={[styles.label, { color: colors.muted }]} localized>NOTE · OPTIONAL</AppText><TextInput value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}<TouchableOpacity disabled={saving || !goal} onPress={() => void submit()} style={[styles.submit, { opacity: saving || !goal ? 0.6 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.submitText} localized>{kind === 'withdraw' ? 'Record withdrawal' : 'Record contribution'}</AppText>}</TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 18, fontWeight: '700' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 17, marginBottom: 8 }, input: { minHeight: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14 }, amount: { fontSize: 20, fontWeight: '700' }, error: { color: palette.red, fontSize: 12, marginTop: 12 }, submit: { minHeight: 52, backgroundColor: palette.blue, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' } });
