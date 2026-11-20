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
import { Transaction } from '@/finance/database';
import { formatMinorAmount } from '@/finance/money';
import { useFinanceStore } from '@/finance/store';
import { palette, radius, spacing } from '@/theme/tokens';

function displayDate(value: string, language: 'en' | 'bn') { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }

export default function TransactionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [item, setItem] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const remove = useFinanceStore(state => state.remove);
  useEffect(() => { let active = true; void useFinanceStore.getState().getTransaction(id).then(result => { if (active) setItem(result); }).catch(() => { if (active) setError('Could not load the transaction.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  function confirmDelete() { Alert.alert('Delete transaction?', 'Its amount will be removed from your local totals.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { if (item) void remove(item.id).then(() => router.back()).catch(() => setError('Could not delete the transaction.')); } }]); }
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><View style={styles.content}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.heading} localized>Transaction details</AppText><View style={{ width: 42 }} /></View>
    {loading ? <ActivityIndicator color={palette.blue} style={{ marginTop: 60 }} /> : error ? <AppText style={styles.error} localized>{error}</AppText> : !item ? <AppText style={[styles.empty, { color: colors.muted }]} localized>This transaction is no longer available.</AppText> : <>
      <Surface style={styles.summary}><View style={[styles.icon, { backgroundColor: `${item.categoryColor}18` }]}><Ionicons name={item.categoryIcon as keyof typeof Ionicons.glyphMap} size={27} color={item.categoryColor} /></View><AppText style={styles.title}>{item.title}</AppText><AppText style={[styles.amount, { color: item.kind === 'income' ? palette.green : palette.red }]}>{item.kind === 'income' ? '+' : '−'}{formatMinorAmount(item.amountMinor, item.currency)}</AppText><AppText style={[styles.kind, { color: colors.muted }]} localized>{item.kind === 'income' ? 'Income' : 'Expense'}</AppText></Surface>
      <Surface style={styles.details}>{[["Category", item.categoryName], ["Date", displayDate(item.occurredAt, language)], ["Wallet", item.walletName], ["Currency", item.currency]].map(([label, value]) => <View key={label} style={[styles.detailRow, { borderBottomColor: colors.border }]}><AppText style={[styles.detailLabel, { color: colors.muted }]} localized>{label}</AppText><AppText style={styles.detailValue}>{value}</AppText></View>)}{item.note ? <View style={[styles.note, { borderBottomColor: colors.border }]}><AppText style={[styles.detailLabel, { color: colors.muted }]} localized>Note</AppText><AppText style={styles.detailValue}>{item.note}</AppText></View> : null}</Surface>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/transaction/new?kind=${item.kind}&id=${item.id}`)} style={styles.edit}><Ionicons name="create-outline" size={18} color="#FFFFFF" /><AppText style={styles.editText} localized>Edit transaction</AppText></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={confirmDelete} style={styles.delete}><Ionicons name="trash-outline" size={18} color={palette.red} /><AppText style={styles.deleteText} localized>Delete transaction</AppText></TouchableOpacity>
    </>}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flex: 1, padding: spacing.md }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 18, fontWeight: '700' }, summary: { alignItems: 'center', padding: 25, borderRadius: radius.lg }, icon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }, title: { fontSize: 19, fontWeight: '700' }, amount: { fontSize: 30, fontWeight: '700', marginTop: 12 }, kind: { fontSize: 12, marginTop: 5 }, details: { paddingHorizontal: 16, marginTop: 15 }, detailRow: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailLabel: { fontSize: 12 }, detailValue: { fontSize: 12, fontWeight: '600', textAlign: 'right', flexShrink: 1 }, note: { paddingVertical: 14, gap: 7 }, edit: { height: 52, borderRadius: radius.md, backgroundColor: palette.blue, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, editText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, delete: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }, deleteText: { color: palette.red, fontSize: 13, fontWeight: '600' }, error: { color: palette.red, textAlign: 'center', marginTop: 24 }, empty: { textAlign: 'center', marginTop: 32 } });
