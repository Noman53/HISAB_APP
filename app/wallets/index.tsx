import { Ionicons } from '@expo/vector-icons';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/finance/store';
import { formatMinorAmount } from '@/finance/money';
import { palette, radius, spacing } from '@/theme/tokens';

const typeLabels = { cash: 'Cash', bank: 'Bank account', bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', credit: 'Credit card', savings: 'Savings account', other: 'Other' };

export default function WalletsScreen() {
  const { colors } = useTheme();
  const data = useFinanceStore(state => state.data);
  const byCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const wallet of data?.wallets ?? []) totals.set(wallet.currency, (totals.get(wallet.currency) ?? 0) + wallet.balanceMinor);
    return [...totals.entries()];
  }, [data?.wallets]);
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><View style={styles.content}>
    <View style={styles.header}><View><AppText style={[styles.eyebrow, { color: colors.muted }]} localized>YOUR ACCOUNTS</AppText><AppText style={styles.heading} localized>Wallets</AppText></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Add wallet" onPress={() => router.push('/wallet/new')} style={styles.add}><Ionicons name="add" size={24} color="#FFFFFF" /></TouchableOpacity></View>
    <Surface style={styles.currencySummary}><AppText style={styles.summaryTitle} localized>Balance by currency</AppText><AppText style={[styles.summaryNote, { color: colors.muted }]} localized>Currencies are kept separate until you set a valuation rate.</AppText><View style={styles.summaryValues}>{byCurrency.map(([currency, amount]) => <View key={currency} style={[styles.currencyPill, { backgroundColor: colors.soft }]}><AppText style={[styles.currencyCode, { color: palette.blue }]}>{currency}</AppText><AppText style={styles.currencyTotal}>{formatMinorAmount(amount, currency)}</AppText></View>)}</View></Surface>
    <View style={styles.section}><AppText style={styles.sectionTitle} localized>All wallets</AppText><AppText style={[styles.sectionCount, { color: colors.muted }]}>{data?.wallets.length ?? 0}</AppText></View>
    <ScrollView contentContainerStyle={styles.list}>{(data?.wallets ?? []).map(wallet => <TouchableOpacity key={wallet.id} accessibilityRole="button" onPress={() => router.push(`/wallets/${wallet.id}`)}><Surface style={styles.wallet}><View style={[styles.icon, { backgroundColor: `${wallet.color}18` }]}><Ionicons name={wallet.icon as keyof typeof Ionicons.glyphMap} size={20} color={wallet.color} /></View><View style={styles.walletInfo}><AppText style={styles.walletName}>{wallet.name}</AppText><AppText style={[styles.walletType, { color: colors.muted }]}>{typeLabels[wallet.type]} · {wallet.currency}</AppText></View><View style={styles.walletBalance}><AppText style={styles.balance}>{formatMinorAmount(wallet.balanceMinor, wallet.currency)}</AppText><Ionicons name="chevron-forward" size={14} color={colors.muted} /></View></Surface></TouchableOpacity>)}</ScrollView>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flex: 1, padding: spacing.md, paddingTop: 22 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }, eyebrow: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700' }, heading: { fontSize: 25, fontWeight: '700', marginTop: 4 }, add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue }, currencySummary: { padding: 15 }, summaryTitle: { fontSize: 14, fontWeight: '700' }, summaryNote: { fontSize: 10, lineHeight: 15, marginTop: 4 }, summaryValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, currencyPill: { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, gap: 3 }, currencyCode: { fontSize: 9, fontWeight: '700' }, currencyTotal: { fontSize: 12, fontWeight: '700' }, section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 10 }, sectionTitle: { fontSize: 16, fontWeight: '700' }, sectionCount: { fontSize: 11 }, list: { gap: 9, paddingBottom: 24 }, wallet: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, walletInfo: { flex: 1 }, walletName: { fontSize: 13, fontWeight: '700' }, walletType: { fontSize: 10, marginTop: 4 }, walletBalance: { flexDirection: 'row', alignItems: 'center', gap: 4 }, balance: { fontSize: 12, fontWeight: '700' } });
