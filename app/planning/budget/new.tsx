import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { Budget, BudgetPeriod, deleteBudget, loadBudgets, saveBudget } from '@/finance/database';
import { currencyDigits, parseAmountToMinor } from '@/finance/money';
import { useFinanceStore } from '@/finance/store';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

export default function BudgetFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const data = useFinanceStore(state => state.data);
  const categories = (data?.categories ?? []).filter(category => category.kind === 'expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currency = data?.currency ?? 'BDT';
  useEffect(() => { if (!id) return; void loadBudgets().then(items => { const item: Budget | undefined = items.find(entry => entry.id === id); if (item) { setName(item.name); setAmount((item.amountMinor / (10 ** currencyDigits(item.currency))).toFixed(currencyDigits(item.currency))); setPeriod(item.period); setCategoryId(item.categoryId); } }).catch(() => setError('Could not load this budget.')); }, [id]);
  async function submit() {
    setError(''); let amountMinor: number;
    try { amountMinor = parseAmountToMinor(amount, currency); if (!name.trim()) throw new Error('Enter a budget name.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the budget details.'); return; }
    setSaving(true); try { await saveBudget({ id, name, amountMinor, currency, period, categoryId }); router.back(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save this budget.'); } finally { setSaving(false); }
  }
  function confirmDelete() { if (!id) return; Alert.alert('Delete budget?', 'Saved transactions will not be changed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void deleteBudget(id).then(() => router.back()).catch(() => setError('Could not delete the budget.')); } }]); }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>{id ? 'Edit budget' : 'Create budget'}</AppText><View style={{ width: 42 }} /></View>
    <AppText style={[styles.label, { color: colors.muted }]} localized>BUDGET NAME</AppText><TextInput value={name} onChangeText={setName} placeholder="e.g. Home expenses" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <AppText style={[styles.label, { color: colors.muted }]}>SPENDING LIMIT · {currency}</AppText><Surface style={styles.amountCard}><AppText style={styles.currency}>{currency}</AppText><TextInput accessibilityLabel="Budget amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} style={[styles.amountInput, { color: colors.text }]} /></Surface>
    <AppText style={[styles.label, { color: colors.muted }]} localized>PERIOD</AppText><View style={styles.options}>{(['weekly', 'monthly'] as BudgetPeriod[]).map(value => <TouchableOpacity key={value} onPress={() => setPeriod(value)} style={[styles.option, { backgroundColor: period === value ? colors.soft : colors.card, borderColor: period === value ? palette.blue : colors.border }]}><AppText style={{ color: period === value ? palette.blue : colors.text, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }} localized>{value}</AppText></TouchableOpacity>)}</View>
    <AppText style={[styles.label, { color: colors.muted }]} localized>CATEGORY</AppText><View style={styles.options}><TouchableOpacity onPress={() => setCategoryId(null)} style={[styles.option, { backgroundColor: categoryId === null ? colors.soft : colors.card, borderColor: categoryId === null ? palette.blue : colors.border }]}><AppText style={{ color: categoryId === null ? palette.blue : colors.text, fontSize: 12, fontWeight: '600' }} localized>All categories</AppText></TouchableOpacity>{categories.map(category => <TouchableOpacity key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.option, { backgroundColor: categoryId === category.id ? colors.soft : colors.card, borderColor: categoryId === category.id ? palette.blue : colors.border }]}><AppText style={{ color: categoryId === category.id ? palette.blue : colors.text, fontSize: 12, fontWeight: '600' }}>{category.name}</AppText></TouchableOpacity>)}</View>
    {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}<TouchableOpacity disabled={saving} onPress={() => void submit()} style={[styles.submit, { opacity: saving ? 0.7 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.submitText} localized>{id ? 'Save changes' : 'Save budget'}</AppText>}</TouchableOpacity>{id ? <TouchableOpacity onPress={confirmDelete} style={styles.delete}><Ionicons name="trash-outline" size={16} color={palette.red} /><AppText style={styles.deleteText} localized>Delete budget</AppText></TouchableOpacity> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 19, fontWeight: '700' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 18 }, input: { minHeight: 51, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 14 }, amountCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, currency: { fontSize: 12, color: palette.blue, fontWeight: '700', marginRight: 8 }, amountInput: { flex: 1, minHeight: 58, fontSize: 24, fontWeight: '700' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minHeight: 38, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, error: { color: palette.red, fontSize: 12, marginTop: 14 }, submit: { minHeight: 53, borderRadius: radius.md, backgroundColor: palette.blue, justifyContent: 'center', alignItems: 'center', marginTop: 24 }, submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 }, delete: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, deleteText: { color: palette.red, fontSize: 12, fontWeight: '700' } });
