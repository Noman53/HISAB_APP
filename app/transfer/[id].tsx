import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { Surface } from '@/components/Surface';
import { useTheme } from '@/theme/ThemeProvider';
import { Transfer } from '@/finance/database';
import { formatMinorAmount } from '@/finance/money';
import { useFinanceStore } from '@/finance/store';
import { palette, radius, spacing } from '@/theme/tokens';

function displayDate(value: string, language: 'en' | 'bn') { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function displayRate(value: number, scale: number) { return (value / scale).toFixed(8).replace(/0+$/, '').replace(/\.$/, ''); }

export default function TransferDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [item, setItem] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const remove = useFinanceStore(state => state.removeTransfer);
  useEffect(() => { let active = true; void useFinanceStore.getState().getTransfer(id).then(result => { if (active) setItem(result); }).catch(() => { if (active) setError('Could not load this transfer.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  function confirmDelete() { Alert.alert('Delete transfer?', 'The transfer and any associated fee expense will be removed atomically.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void remove(id).then(() => router.back()).catch(() => setError('Could not delete the transfer.')); } }]); }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><View style={styles.content}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>Transfer details</AppText><View style={{ width: 42 }} /></View>
    {loading ? <ActivityIndicator color={palette.blue} style={{ marginTop: 55 }} /> : error ? <AppText style={styles.error} localized>{error}</AppText> : !item ? <AppText style={[styles.empty, { color: colors.muted }]} localized>This transfer is no longer available.</AppText> : <>
      <Surface style={styles.summary}><View style={styles.icon}><Ionicons name="swap-horizontal" size={25} color={palette.blue} /></View><AppText style={styles.wallet}>{item.fromWalletName}</AppText><AppText style={styles.amount}>{formatMinorAmount(item.fromAmountMinor, item.fromCurrency)}</AppText><Ionicons name="arrow-down" size={18} color={colors.muted} style={{ marginVertical: 10 }} /><AppText style={styles.wallet}>{item.toWalletName}</AppText><AppText style={styles.received}>{formatMinorAmount(item.toAmountMinor, item.toCurrency)}</AppText></Surface>
      <Surface style={styles.details}><View style={[styles.detailRow, { borderBottomColor: colors.border }]}><AppText style={[styles.label, { color: colors.muted }]} localized>Date</AppText><AppText style={styles.value}>{displayDate(item.occurredAt, language)}</AppText></View><View style={[styles.detailRow, { borderBottomColor: colors.border }]}><AppText style={[styles.label, { color: colors.muted }]} localized>Rate recorded</AppText><AppText style={styles.value}>1 {item.fromCurrency} = {displayRate(item.exchangeRateScaled, item.rateScale)} {item.toCurrency}</AppText></View><View style={[styles.detailRow, { borderBottomColor: colors.border }]}><AppText style={[styles.label, { color: colors.muted }]} localized>Fee</AppText><AppText style={styles.value}>{formatMinorAmount(item.feeMinor, item.fromCurrency)}</AppText></View>{item.note ? <View style={styles.note}><AppText style={[styles.label, { color: colors.muted }]} localized>Note</AppText><AppText style={styles.value}>{item.note}</AppText></View> : null}</Surface>
      <AppText style={[styles.info, { color: colors.muted }]} localized>Transfers are excluded from income and expense totals. Any fee is recorded separately as an expense.</AppText>
      <TouchableOpacity accessibilityRole="button" onPress={confirmDelete} style={styles.delete}><Ionicons name="trash-outline" size={18} color={palette.red} /><AppText style={styles.deleteText} localized>Delete transfer</AppText></TouchableOpacity>
    </>}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flex: 1, padding: spacing.md }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 18, fontWeight: '700' }, summary: { alignItems: 'center', padding: 22, borderRadius: radius.lg }, icon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB14', marginBottom: 13 }, wallet: { fontSize: 12, fontWeight: '600', color: '#64748B' }, amount: { fontSize: 20, fontWeight: '700', marginTop: 4 }, received: { color: palette.green, fontSize: 22, fontWeight: '700', marginTop: 4 }, details: { marginTop: 14, paddingHorizontal: 15 }, detailRow: { minHeight: 51, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, label: { fontSize: 11 }, value: { fontSize: 12, fontWeight: '600', textAlign: 'right', flexShrink: 1 }, note: { paddingVertical: 13, gap: 6 }, info: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 14 }, delete: { minHeight: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 }, deleteText: { color: palette.red, fontSize: 13, fontWeight: '700' }, error: { color: palette.red, textAlign: 'center', marginTop: 25 }, empty: { textAlign: 'center', marginTop: 30 } });
