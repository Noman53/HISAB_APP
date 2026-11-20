import { Ionicons } from '@expo/vector-icons';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { DatePickerField } from '@/components/DatePickerField';
import { Surface } from '@/components/Surface';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';
import { isValidDateOnly, TransactionKind, currencyDigits } from '@/finance/money';
import { useFinanceStore } from '@/finance/store';
import { selectCategories } from '@/finance/selectors';
import { parseAmountToMinor } from '@/finance/money';

function localDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }

export default function TransactionFormScreen() {
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind: TransactionKind = params.kind === 'income' ? 'income' : 'expense';
  const editing = !!params.id;
  const { colors } = useTheme();
  const data = useFinanceStore(state => state.data);
  const save = useFinanceStore(state => state.save);
  const allCategories = useFinanceStore(selectCategories);
  const categories = useMemo(() => allCategories.filter(category => category.kind === kind), [allCategories, kind]);
  const [walletId, setWalletId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionId, setTransactionId] = useState<string | undefined>(params.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedWallet = data?.wallets.find(wallet => wallet.id === walletId) ?? data?.wallets[0];
  const currency = selectedWallet?.currency ?? data?.currency ?? 'BDT';
  const selectedCategoryId = useMemo(() => categoryId || categories[0]?.id || '', [categoryId, categories]);

  useEffect(() => {
    if (!params.id) return;
    void useFinanceStore.getState().getTransaction(params.id).then(item => {
      if (!item) { setError('This transaction could not be found.'); return; }
      setTransactionId(item.id); setTitle(item.title); setAmount((item.amountMinor / (10 ** currencyDigits(item.currency))).toFixed(currencyDigits(item.currency))); setDate(item.occurredAt.slice(0, 10)); setNote(item.note ?? ''); setCategoryId(item.categoryId);
      setWalletId(item.walletId);
    }).catch(() => setError('Could not load this transaction.'));
  }, [params.id]);

  async function submit() {
    setError('');
    let amountMinor: number;
    try {
      amountMinor = parseAmountToMinor(amount, currency);
      if (!isValidDateOnly(date)) throw new Error('Enter a real date in YYYY-MM-DD format.');
      if (!selectedCategoryId) throw new Error('Choose a category.');
      if (!selectedWallet?.id) throw new Error('Create a wallet first, then record the transaction.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the entered details.'); return; }
    setSaving(true);
    try {
      await save({ id: transactionId, kind, amountMinor, currency, title, categoryId: selectedCategoryId, walletId: selectedWallet.id, occurredAt: date, note });
      router.back();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save this transaction.'); }
    finally { setSaving(false); }
  }

  const accent = kind === 'income' ? palette.green : palette.red;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>{editing ? 'Edit transaction' : kind === 'income' ? 'Add income' : 'Add expense'}</AppText><View style={{ width: 42 }} /></View>
    <AppText style={[styles.label, { color: colors.muted }]}>AMOUNT · {currency}</AppText>
    <Surface style={styles.amountCard}><AppText style={[styles.currencyPrefix, { color: accent }]}>৳</AppText><TextInput accessibilityLabel="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} style={[styles.amountInput, { color: colors.text }]} /></Surface>
    <AppText style={[styles.label, { color: colors.muted }]} localized>TITLE</AppText><TextInput accessibilityLabel="Title" value={title} onChangeText={setTitle} placeholder={kind === 'income' ? 'e.g. Monthly salary' : 'e.g. Groceries'} placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <View style={styles.labelRow}><AppText style={[styles.label, { color: colors.muted }]} localized>CATEGORY</AppText><AppText style={[styles.hint, { color: colors.muted }]} localized>Choose one</AppText></View>
    <View style={styles.categoryGrid}>{categories.map(category => { const selected = category.id === selectedCategoryId; return <TouchableOpacity key={category.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setCategoryId(category.id)} style={[styles.categoryChip, { backgroundColor: selected ? `${accent}14` : colors.card, borderColor: selected ? accent : colors.border }]}><Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={17} color={selected ? accent : colors.muted} /><AppText style={[styles.categoryName, { color: selected ? accent : colors.text }]}>{category.name}</AppText></TouchableOpacity>; })}</View>
    <AppText style={[styles.label, { color: colors.muted }]}>WALLET · {currency}</AppText><View style={styles.categoryGrid}>{(data?.wallets ?? []).map(wallet => { const selected = wallet.id === selectedWallet?.id; return <TouchableOpacity key={wallet.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { if (wallet.id !== selectedWallet?.id) { setWalletId(wallet.id); setAmount(''); } }} style={[styles.categoryChip, { backgroundColor: selected ? colors.soft : colors.card, borderColor: selected ? palette.blue : colors.border }]}><Ionicons name={wallet.icon as keyof typeof Ionicons.glyphMap} size={17} color={selected ? palette.blue : colors.muted} /><AppText style={[styles.categoryName, { color: selected ? palette.blue : colors.text }]}>{wallet.name}</AppText></TouchableOpacity>; })}<TouchableOpacity accessibilityRole="button" onPress={() => router.push('/wallet/new')} style={[styles.categoryChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="add-circle-outline" size={17} color={palette.blue} /><AppText style={[styles.categoryName, { color: palette.blue }]} localized>New wallet</AppText></TouchableOpacity></View>
    <AppText style={[styles.label, { color: colors.muted }]} localized>DATE</AppText><DatePickerField accessibilityLabel="Date" value={date} onChange={setDate} />
    <AppText style={[styles.label, { color: colors.muted }]} localized>NOTE · OPTIONAL</AppText><TextInput accessibilityLabel="Note" value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={colors.muted} multiline style={[styles.input, styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
    <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={[styles.submit, { backgroundColor: accent, opacity: saving ? 0.7 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.submitText} localized>{editing ? 'Save changes' : `Save ${kind}`}</AppText>}</TouchableOpacity>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 19, fontWeight: '700' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 18 }, amountCard: { minHeight: 90, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md }, currencyPrefix: { fontSize: 30, fontWeight: '700', marginRight: 8 }, amountInput: { flex: 1, fontSize: 34, fontWeight: '700', paddingVertical: 14 }, input: { minHeight: 52, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 15 }, noteInput: { minHeight: 88, paddingTop: 14, textAlignVertical: 'top' }, labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, hint: { fontSize: 11, marginTop: 18, marginBottom: 8 }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 40, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12 }, categoryName: { fontSize: 12, fontWeight: '600' }, error: { color: palette.red, fontSize: 13, marginTop: 14 }, submit: { minHeight: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textTransform: 'capitalize' } });
