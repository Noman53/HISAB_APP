import { Ionicons } from '@expo/vector-icons';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/finance/store';
import { parseSignedAmountToMinor, currencyDigits } from '@/finance/money';
import { WalletType } from '@/finance/database';
import { palette, radius, spacing } from '@/theme/tokens';

const walletTypes: { id: WalletType; label: string }[] = [{ id: 'cash', label: 'Cash' }, { id: 'bank', label: 'Bank' }, { id: 'bkash', label: 'bKash' }, { id: 'nagad', label: 'Nagad' }, { id: 'rocket', label: 'Rocket' }, { id: 'credit', label: 'Credit card' }, { id: 'savings', label: 'Savings' }, { id: 'other', label: 'Other' }];
const currencies = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'SGD', 'PKR', 'AED', 'SAR', 'CNY', 'CHF'];

export default function WalletFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useFinanceStore(state => state.data);
  const saveWallet = useFinanceStore(state => state.saveWallet);
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [currency, setCurrency] = useState('BDT');
  const [customCurrency, setCustomCurrency] = useState(false);
  const [opening, setOpening] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!id) return; const wallet = data?.wallets.find(item => item.id === id); if (wallet) { setName(wallet.name); setType(wallet.type); setCurrency(wallet.currency); setCustomCurrency(!currencies.includes(wallet.currency)); setOpening((wallet.openingBalanceMinor / (10 ** currencyDigits(wallet.currency))).toFixed(currencyDigits(wallet.currency))); } }, [id, data?.wallets]);
  async function submit() {
    setError(''); let openingBalanceMinor = 0;
    try { if (!id && opening.trim() !== '') openingBalanceMinor = parseSignedAmountToMinor(opening, currency); if (!name.trim()) throw new Error('Enter a wallet name.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the wallet details.'); return; }
    setSaving(true); try { await saveWallet({ id, name, type, currency, openingBalanceMinor }); router.back(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save this wallet.'); } finally { setSaving(false); }
  }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>{id ? 'Edit wallet' : 'Add wallet'}</AppText><View style={{ width: 42 }} /></View>
    <AppText style={[styles.label, { color: colors.muted }]} localized>WALLET NAME</AppText><TextInput accessibilityLabel="Wallet name" value={name} onChangeText={setName} placeholder="e.g. Daily cash" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <AppText style={[styles.label, { color: colors.muted }]} localized>ACCOUNT TYPE</AppText><View style={styles.options}>{walletTypes.map(value => <TouchableOpacity key={value.id} onPress={() => setType(value.id)} accessibilityRole="button" accessibilityState={{ selected: type === value.id }} style={[styles.option, { backgroundColor: type === value.id ? colors.soft : colors.card, borderColor: type === value.id ? palette.blue : colors.border }]}><AppText style={{ color: type === value.id ? palette.blue : colors.text, fontSize: 12, fontWeight: '600' }} localized>{value.label}</AppText></TouchableOpacity>)}</View>
    <AppText style={[styles.label, { color: colors.muted }]}>CURRENCY{ id ? ' · LOCKED AFTER CREATION' : ''}</AppText><View style={styles.options}>{[...currencies, 'Other'].map(value => { const selected = value === 'Other' ? customCurrency : !customCurrency && currency === value; return <TouchableOpacity key={value} disabled={!!id} onPress={() => { if (value === 'Other') { setCustomCurrency(true); setCurrency(''); } else { setCustomCurrency(false); setCurrency(value); } }} accessibilityRole="button" accessibilityState={{ selected, disabled: !!id }} style={[styles.option, { backgroundColor: selected ? colors.soft : colors.card, borderColor: selected ? palette.blue : colors.border, opacity: id ? 0.7 : 1 }]}><AppText style={{ color: selected ? palette.blue : colors.text, fontSize: 12, fontWeight: '600' }}>{value}</AppText></TouchableOpacity>; })}</View>
    {customCurrency ? <TextInput accessibilityLabel="Currency code" editable={!id} maxLength={3} autoCapitalize="characters" value={currency} onChangeText={value => setCurrency(value.toUpperCase())} placeholder="3-letter code, e.g. THB" placeholderTextColor={colors.muted} style={[styles.input, styles.currencyInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /> : null}
    {!id ? <><AppText style={[styles.label, { color: colors.muted }]}>OPENING BALANCE · {currency}</AppText><Surface style={styles.amountCard}><AppText style={styles.currencyMark}>{currency}</AppText><TextInput accessibilityLabel="Opening balance" keyboardType="default" value={opening} onChangeText={setOpening} placeholder="0" placeholderTextColor={colors.muted} style={[styles.amountInput, { color: colors.text }]} /></Surface><AppText style={[styles.hint, { color: colors.muted }]} localized>Starting balance. A negative amount can represent credit card debt.</AppText></> : <AppText style={[styles.hint, { color: colors.muted }]} localized>Wallet currency and opening balance stay fixed to protect existing records.</AppText>}
    {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
    <TouchableOpacity disabled={saving} onPress={() => void submit()} style={[styles.submit, { opacity: saving ? 0.7 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.submitText} localized>{id ? 'Save changes' : 'Create wallet'}</AppText>}</TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 19, fontWeight: '700' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 18 }, input: { minHeight: 52, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 14 }, currencyInput: { marginTop: 9 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minHeight: 39, paddingHorizontal: 12, borderWidth: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }, amountCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, currencyMark: { color: palette.blue, fontSize: 15, fontWeight: '700', marginRight: 10 }, amountInput: { flex: 1, fontSize: 22, fontWeight: '700', paddingVertical: 15 }, hint: { fontSize: 11, lineHeight: 17, marginTop: 8 }, error: { color: palette.red, fontSize: 13, marginTop: 14 }, submit: { minHeight: 54, backgroundColor: palette.blue, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginTop: 26 }, submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 } });
