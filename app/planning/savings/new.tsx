import { Ionicons } from '@expo/vector-icons';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { DatePickerField } from '@/components/DatePickerField';
import { useTheme } from '@/theme/ThemeProvider';
import { saveSavingsGoal } from '@/finance/database';
import { currencyDigits, parseAmountToMinor } from '@/finance/money';
import { useFinanceStore } from '@/finance/store';
import { palette, radius, spacing } from '@/theme/tokens';

export default function NewSavingsGoal() {
  const { colors } = useTheme(); const currency = useFinanceStore(state => state.data?.currency ?? 'BDT');
  const [name, setName] = useState(''); const [target, setTarget] = useState(''); const [targetDate, setTargetDate] = useState(''); const [description, setDescription] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function submit() { setError(''); let targetMinor: number; try { targetMinor = parseAmountToMinor(target, currency); if (!name.trim()) throw new Error('Enter a goal name.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the goal details.'); return; } setSaving(true); try { await saveSavingsGoal({ name, targetMinor, currency, targetDate: targetDate || undefined, description }); router.back(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the goal.'); } finally { setSaving(false); } }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>Create savings goal</AppText><View style={{ width: 42 }} /></View>
    <AppText style={[styles.label, { color: colors.muted }]} localized>GOAL NAME</AppText><TextInput value={name} onChangeText={setName} placeholder="e.g. Emergency fund" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <AppText style={[styles.label, { color: colors.muted }]}>TARGET AMOUNT · {currency}</AppText><TextInput keyboardType="decimal-pad" value={target} onChangeText={setTarget} placeholder="0.00" placeholderTextColor={colors.muted} style={[styles.input, styles.amount, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <AppText style={[styles.label, { color: colors.muted }]} localized>TARGET DATE · OPTIONAL</AppText><DatePickerField accessibilityLabel="Target date" value={targetDate} onChange={setTargetDate} allowClear />
    <AppText style={[styles.label, { color: colors.muted }]} localized>DESCRIPTION · OPTIONAL</AppText><TextInput multiline value={description} onChangeText={setDescription} placeholder="What are you saving for?" placeholderTextColor={colors.muted} style={[styles.input, styles.description, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}<TouchableOpacity disabled={saving} onPress={() => void submit()} style={[styles.submit, { opacity: saving ? 0.7 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.submitText} localized>Create goal</AppText>}</TouchableOpacity>
    <AppText style={[styles.note, { color: colors.muted }]} localized>Goal contributions track progress only; they don’t change wallet balances.</AppText>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 18, fontWeight: '700' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 17, marginBottom: 8 }, input: { minHeight: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 14 }, amount: { fontSize: 22, fontWeight: '700' }, description: { minHeight: 85, textAlignVertical: 'top', paddingTop: 13 }, error: { color: palette.red, fontSize: 12, marginTop: 12 }, submit: { minHeight: 53, borderRadius: radius.md, backgroundColor: palette.blue, justifyContent: 'center', alignItems: 'center', marginTop: 24 }, submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, note: { fontSize: 10, textAlign: 'center', marginTop: 11 } });
