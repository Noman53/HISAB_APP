import { Ionicons } from '@expo/vector-icons';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { DatePickerField } from '@/components/DatePickerField';
import { Surface } from '@/components/Surface';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/finance/store';
import { convertMinorByRate, formatMinorAmount, isValidDateOnly, parseAmountToMinor, parseRateToScaled, RATE_SCALE } from '@/finance/money';
import { palette, radius, spacing } from '@/theme/tokens';

function localDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
function parseFee(value: string, currency: string) { const normalized = value.trim().replace(/,/g, ''); return normalized === '' || /^0(?:\.0+)?$/.test(normalized) ? 0 : parseAmountToMinor(value, currency); }

export default function TransferScreen() {
  const params = useLocalSearchParams<{ fromId?: string; toId?: string }>();
  const { colors } = useTheme();
  const data = useFinanceStore(state => state.data);
  const saveTransfer = useFinanceStore(state => state.saveTransfer);
  const wallets = data?.wallets ?? [];
  const [fromId, setFromId] = useState(params.fromId ?? '');
  const [toId, setToId] = useState(params.toId ?? '');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState('0');
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (wallets.length && !fromId) setFromId(wallets[0].id); if (wallets.length > 1 && !toId) setToId(wallets.find(wallet => wallet.id !== (fromId || wallets[0].id))?.id ?? ''); }, [wallets, fromId, toId]);
  const fromWallet = wallets.find(wallet => wallet.id === fromId);
  const toWallet = wallets.find(wallet => wallet.id === toId);
  const sameCurrency = !!fromWallet && fromWallet.currency === toWallet?.currency;
  const conversion = useMemo(() => {
    if (!fromWallet || !toWallet || !amount.trim()) return null;
    try { const fromMinor = parseAmountToMinor(amount, fromWallet.currency); const rateScaled = sameCurrency ? RATE_SCALE : parseRateToScaled(rate); const toMinor = convertMinorByRate(fromMinor, fromWallet.currency, toWallet.currency, rateScaled); return { fromMinor, rateScaled, toMinor }; }
    catch { return null; }
  }, [amount, fromWallet, toWallet, rate, sameCurrency]);
  async function submit() {
    setError('');
    try {
      if (!fromWallet || !toWallet) throw new Error('Create at least two wallets before transferring money.');
      if (fromWallet.id === toWallet.id) throw new Error('Choose two different wallets.');
      if (!conversion) throw new Error(sameCurrency ? 'Enter a valid amount.' : 'Enter an amount and a valid exchange rate.');
      const feeMinor = parseFee(fee, fromWallet.currency);
      if (!isValidDateOnly(date)) throw new Error('Enter a valid date in YYYY-MM-DD format.');
      setSaving(true);
      await saveTransfer({ fromWalletId: fromWallet.id, toWalletId: toWallet.id, fromAmountMinor: conversion.fromMinor, toAmountMinor: conversion.toMinor, exchangeRateScaled: conversion.rateScaled, rateScale: RATE_SCALE, feeMinor, occurredAt: date, note });
      router.back();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not record the transfer.'); }
    finally { setSaving(false); }
  }
  function chooseFrom(id: string) { setFromId(id); if (toId === id) setToId(wallets.find(wallet => wallet.id !== id)?.id ?? ''); setAmount(''); setRate(''); }
  function chooseTo(id: string) { setToId(id); setAmount(''); setRate(''); }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>Transfer money</AppText><View style={{ width: 42 }} /></View>
    <AppText style={[styles.label, { color: colors.muted }]} localized>FROM WALLET</AppText><View style={styles.walletOptions}>{wallets.map(wallet => <TouchableOpacity key={wallet.id} onPress={() => chooseFrom(wallet.id)} style={[styles.walletChip, { backgroundColor: fromId === wallet.id ? colors.soft : colors.card, borderColor: fromId === wallet.id ? palette.blue : colors.border }]}><Ionicons name={wallet.icon as keyof typeof Ionicons.glyphMap} size={16} color={fromId === wallet.id ? palette.blue : colors.muted} /><AppText style={{ color: fromId === wallet.id ? palette.blue : colors.text, fontSize: 11, fontWeight: '600' }}>{wallet.name} · {wallet.currency}</AppText></TouchableOpacity>)}</View>
    <AppText style={[styles.label, { color: colors.muted }]} localized>TO WALLET</AppText><View style={styles.walletOptions}>{wallets.filter(wallet => wallet.id !== fromId).map(wallet => <TouchableOpacity key={wallet.id} onPress={() => chooseTo(wallet.id)} style={[styles.walletChip, { backgroundColor: toId === wallet.id ? colors.soft : colors.card, borderColor: toId === wallet.id ? palette.blue : colors.border }]}><Ionicons name={wallet.icon as keyof typeof Ionicons.glyphMap} size={16} color={toId === wallet.id ? palette.blue : colors.muted} /><AppText style={{ color: toId === wallet.id ? palette.blue : colors.text, fontSize: 11, fontWeight: '600' }}>{wallet.name} · {wallet.currency}</AppText></TouchableOpacity>)}<TouchableOpacity onPress={() => router.push('/wallet/new')} style={[styles.walletChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="add" size={16} color={palette.blue} /><AppText style={{ color: palette.blue, fontSize: 11, fontWeight: '600' }} localized>New wallet</AppText></TouchableOpacity></View>
    {wallets.length < 2 ? <TouchableOpacity onPress={() => router.push('/wallet/new')}><AppText style={styles.link} localized>Add another wallet to make a transfer</AppText></TouchableOpacity> : null}
    <AppText style={[styles.label, { color: colors.muted }]}>AMOUNT · {fromWallet?.currency ?? '—'}</AppText><Surface style={styles.amountCard}><TextInput accessibilityLabel="Transfer amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} style={[styles.amountInput, { color: colors.text }]} /></Surface>
    {fromWallet && toWallet && !sameCurrency ? <><AppText style={[styles.label, { color: colors.muted }]}>EXCHANGE RATE · 1 {fromWallet.currency} = ? {toWallet.currency}</AppText><TextInput accessibilityLabel="Exchange rate" keyboardType="decimal-pad" value={rate} onChangeText={setRate} placeholder="Enter rate manually" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /><AppText style={[styles.hint, { color: colors.muted }]} localized>This rate is saved with the transfer and will not change later.</AppText></> : null}
    <View style={styles.conversion}><Ionicons name="swap-horizontal" size={19} color={palette.blue} /><AppText style={styles.conversionText} localized>{conversion && toWallet ? `You send ${formatMinorAmount(conversion.fromMinor, fromWallet!.currency)} · They receive ${formatMinorAmount(conversion.toMinor, toWallet.currency)}` : 'Enter an amount to preview the transfer'}</AppText></View>
    <AppText style={[styles.label, { color: colors.muted }]}>TRANSFER FEE · {fromWallet?.currency ?? '—'} · OPTIONAL</AppText><TextInput accessibilityLabel="Transfer fee" keyboardType="decimal-pad" value={fee} onChangeText={setFee} placeholder="0" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <AppText style={[styles.label, { color: colors.muted }]} localized>DATE</AppText><DatePickerField accessibilityLabel="Transfer date" value={date} onChange={setDate} />
    <AppText style={[styles.label, { color: colors.muted }]} localized>NOTE · OPTIONAL</AppText><TextInput accessibilityLabel="Transfer note" value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
    <TouchableOpacity disabled={saving || wallets.length < 2} onPress={() => void submit()} style={[styles.submit, { opacity: saving || wallets.length < 2 ? 0.6 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.submitText} localized>Record transfer</AppText>}</TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 19, fontWeight: '700' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 17 }, walletOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, walletChip: { minHeight: 39, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 }, amountCard: { paddingHorizontal: 14 }, amountInput: { minHeight: 58, fontSize: 25, fontWeight: '700', paddingVertical: 12 }, input: { minHeight: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 14 }, hint: { fontSize: 10, marginTop: 6 }, conversion: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#2563EB12', borderRadius: radius.sm, marginTop: 14 }, conversionText: { flex: 1, fontSize: 11, color: palette.blue, fontWeight: '600' }, link: { color: palette.blue, fontSize: 12, fontWeight: '700', marginTop: 8 }, error: { color: palette.red, fontSize: 12, marginTop: 12 }, submit: { minHeight: 54, borderRadius: radius.md, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' } });
