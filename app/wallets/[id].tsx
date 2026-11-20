import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { Surface } from '@/components/Surface';
import { useTheme } from '@/theme/ThemeProvider';
import { Transaction, Transfer, Wallet } from '@/finance/database';
import { formatMinorAmount } from '@/finance/money';
import { useFinanceStore } from '@/finance/store';
import { palette, radius, spacing } from '@/theme/tokens';

function displayDate(value: string, language: 'en' | 'bn') { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

export default function WalletDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const data = useFinanceStore(state => state.data);
  const removeWallet = useFinanceStore(state => state.removeWallet);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  useEffect(() => { let active = true; Promise.all([useFinanceStore.getState().getWallet(id), useFinanceStore.getState().getWalletTransfers(id), useFinanceStore.getState().getWalletTransactions(id)]).then(([result, ledger, entries]) => { if (active) { setWallet(result); setTransfers(ledger); setTransactions(entries); } }).catch(() => { if (active) setError('Could not load this wallet.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id, data?.wallets]);
  function onDelete() { Alert.alert('Delete wallet?', 'A wallet with saved transactions or transfers cannot be deleted.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void removeWallet(id).then(() => router.replace('/wallets')).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not delete this wallet.')); } }]); }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><View style={styles.content}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>Wallet details</AppText><TouchableOpacity accessibilityLabel="Edit wallet" onPress={() => router.push(`/wallet/new?id=${id}`)} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="create-outline" size={19} color={colors.text} /></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={palette.blue} style={{ marginTop: 45 }} /> : error ? <AppText style={styles.error} localized>{error}</AppText> : !wallet ? <AppText style={[styles.empty, { color: colors.muted }]} localized>This wallet is unavailable.</AppText> : <>
      <Surface style={styles.summary}><View style={[styles.icon, { backgroundColor: `${wallet.color}18` }]}><Ionicons name={wallet.icon as keyof typeof Ionicons.glyphMap} size={25} color={wallet.color} /></View><AppText style={styles.name}>{wallet.name}</AppText><AppText style={[styles.balance, { color: wallet.balanceMinor < 0 ? palette.red : colors.text }]}>{formatMinorAmount(wallet.balanceMinor, wallet.currency)}</AppText><AppText style={[styles.sub, { color: colors.muted }]}>{wallet.type} · {wallet.currency}</AppText></Surface>
      <TouchableOpacity onPress={() => router.push(`/transfer/new?fromId=${wallet.id}`)} style={styles.transferButton}><Ionicons name="swap-horizontal" size={18} color="#FFFFFF" /><AppText style={styles.transferText} localized>Transfer from this wallet</AppText></TouchableOpacity>
      <View style={styles.section}><AppText style={styles.sectionTitle} localized>Transactions</AppText></View>
      <ScrollView contentContainerStyle={styles.list}>
        {transactions.length === 0 ? <Surface style={styles.emptyCard}><AppText style={[styles.emptyText, { color: colors.muted }]} localized>No income or expenses in this wallet yet.</AppText></Surface> : transactions.map(item => <Surface key={item.id} style={styles.row}><View style={[styles.rowIcon, { backgroundColor: `${item.categoryColor}18` }]}><Ionicons name={item.categoryIcon as keyof typeof Ionicons.glyphMap} size={17} color={item.categoryColor} /></View><View style={{ flex: 1 }}><AppText style={styles.rowTitle}>{item.title}</AppText><AppText style={[styles.rowMeta, { color: colors.muted }]}>{item.categoryName} · {displayDate(item.occurredAt, language)}</AppText></View><AppText style={{ fontSize: 12, fontWeight: '700', color: item.kind === 'income' ? palette.green : colors.text }}>{item.kind === 'income' ? '+' : '−'}{formatMinorAmount(item.amountMinor, item.currency)}</AppText></Surface>)}
        {transfers.length ? <View style={styles.section}><AppText style={styles.sectionTitle} localized>Transfers</AppText></View> : null}
        {transfers.map(item => { const sent = item.fromWalletId === id; return <TouchableOpacity key={item.id} onPress={() => router.push(`/transfer/${item.id}`)}><Surface style={styles.row}><View style={[styles.rowIcon, { backgroundColor: colors.soft }]}><Ionicons name="swap-horizontal" size={17} color={palette.blue} /></View><View style={{ flex: 1 }}><AppText style={styles.rowTitle} localized>{sent ? `To ${item.toWalletName}` : `From ${item.fromWalletName}`}</AppText><AppText style={[styles.rowMeta, { color: colors.muted }]} localized>{`${displayDate(item.occurredAt, language)}${item.feeMinor && sent ? ` · Fee ${formatMinorAmount(item.feeMinor, item.fromCurrency)}` : ''}`}</AppText></View><AppText style={{ fontSize: 11, fontWeight: '700' }}>{sent ? '−' : '+'}{formatMinorAmount(sent ? item.fromAmountMinor : item.toAmountMinor, sent ? item.fromCurrency : item.toCurrency)}</AppText></Surface></TouchableOpacity>; })}
        <TouchableOpacity onPress={onDelete} style={styles.delete}><Ionicons name="trash-outline" size={16} color={palette.red} /><AppText style={styles.deleteText} localized>Delete wallet</AppText></TouchableOpacity>
      </ScrollView>
    </>}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flex: 1, padding: spacing.md, paddingTop: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 18, fontWeight: '700' }, summary: { padding: 18, alignItems: 'center', borderRadius: radius.lg }, icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, name: { fontSize: 17, fontWeight: '700' }, balance: { fontSize: 27, fontWeight: '700', marginTop: 8 }, sub: { fontSize: 11, marginTop: 4, textTransform: 'capitalize' }, transferButton: { minHeight: 47, borderRadius: radius.md, backgroundColor: palette.blue, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, transferText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, section: { marginTop: 20, marginBottom: 8 }, sectionTitle: { fontSize: 15, fontWeight: '700' }, list: { gap: 8, paddingBottom: 28 }, row: { padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, rowIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 12, fontWeight: '600' }, rowMeta: { fontSize: 9, marginTop: 3 }, emptyCard: { padding: 16 }, emptyText: { fontSize: 12 }, empty: { textAlign: 'center', marginTop: 25 }, delete: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14 }, deleteText: { color: palette.red, fontSize: 12, fontWeight: '700' }, error: { color: palette.red, textAlign: 'center', marginTop: 20 } });
