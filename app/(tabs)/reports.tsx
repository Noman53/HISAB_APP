import { Ionicons } from '@expo/vector-icons';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { DatePickerField } from '@/components/DatePickerField';
import { Surface } from '@/components/Surface';
import { FinanceReport, loadFinanceReport, Wallet } from '@/finance/database';
import { formatMinorAmount, isValidDateOnly } from '@/finance/money';
import { shareReportExcel, shareReportPdf } from '@/finance/report-export';
import { useFinanceStore } from '@/finance/store';
import { selectWallets } from '@/finance/selectors';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

type Preset = '7 days' | '30 days' | '90 days' | 'This month' | 'This year' | 'Custom';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function rangeFor(preset: Preset) {
  const end = new Date(); const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (preset === 'This month') start.setDate(1);
  else if (preset === 'This year') start.setMonth(0, 1);
  else start.setDate(start.getDate() - (preset === '7 days' ? 6 : preset === '30 days' ? 29 : 89));
  return { start: dateKey(start), end: dateKey(end) };
}

function Metric({ label, amount, color }: { label: string; amount: string; color: string }) {
  const { colors } = useTheme();
  return <Surface style={styles.metric}><AppText style={[styles.metricLabel, { color: colors.muted }]} localized>{label}</AppText><AppText numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color }]}>{amount}</AppText></Surface>;
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const wallets = useFinanceStore(selectWallets);
  const [preset, setPreset] = useState<Preset>('This month');
  const [startDate, setStartDate] = useState(() => rangeFor('This month').start);
  const [endDate, setEndDate] = useState(() => rangeFor('This month').end);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [walletId, setWalletId] = useState<string | undefined>();
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState('');
  const selectedWallet = wallets.find(wallet => wallet.id === walletId);
  const currency = report?.currency ?? selectedWallet?.currency ?? wallets[0]?.currency ?? 'BDT';
  const presets: Preset[] = ['7 days', '30 days', '90 days', 'This month', 'This year'];

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void loadFinanceReport(startDate, endDate, walletId).then(value => { if (active) setReport(value); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load this report.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [startDate, endDate, walletId]);

  const maximumFlow = useMemo(() => Math.max(1, ...(report?.timeline ?? []).flatMap(item => [item.incomeMinor, item.expenseMinor])), [report?.timeline]);
  const maxCategory = Math.max(1, ...(report?.categories ?? []).map(item => item.amountMinor));
  function selectPreset(value: Preset) { const next = rangeFor(value); setPreset(value); setStartDate(next.start); setEndDate(next.end); setDraftStart(next.start); setDraftEnd(next.end); }
  function applyRange() {
    if (!isValidDateOnly(draftStart) || !isValidDateOnly(draftEnd) || draftStart > draftEnd) { setReport(null); setError('Enter valid dates in YYYY-MM-DD order.'); return; }
    setPreset('Custom'); setStartDate(draftStart); setEndDate(draftEnd);
  }
  async function exportFile(kind: 'pdf' | 'xlsx') {
    if (!report) return;
    setExporting(kind); setError('');
    try { if (kind === 'pdf') await shareReportPdf(report); else await shareReportExcel(report); }
    catch (reason) { setError(reason instanceof Error ? reason.message : `Could not create the ${kind.toUpperCase()} report.`); }
    finally { setExporting(null); }
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><AppText style={[styles.eyebrow, { color: colors.muted }]} localized>YOUR MONEY, IN CONTEXT</AppText><AppText style={styles.title} localized>Reports</AppText></View><View style={[styles.headerIcon, { backgroundColor: colors.soft }]}><Ionicons name="stats-chart-outline" size={21} color={palette.blue} /></View></View>
    <AppText style={[styles.sectionLabel, { color: colors.muted }]} localized>DATE RANGE</AppText>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{presets.map(value => <TouchableOpacity key={value} onPress={() => selectPreset(value)} style={[styles.chip, { backgroundColor: preset === value ? colors.soft : colors.card, borderColor: preset === value ? palette.blue : colors.border }]}><AppText style={{ color: preset === value ? palette.blue : colors.text, fontSize: 11, fontWeight: '600' }} localized>{value}</AppText></TouchableOpacity>)}</ScrollView>
    <View style={styles.dateRow}><DatePickerField compact accessibilityLabel="Report start date" value={draftStart} onChange={setDraftStart} style={styles.dateInput} /><AppText style={{ color: colors.muted }} localized>to</AppText><DatePickerField compact accessibilityLabel="Report end date" value={draftEnd} onChange={setDraftEnd} style={styles.dateInput} /><TouchableOpacity onPress={applyRange} accessibilityRole="button" accessibilityLabel="Apply date range" style={styles.apply}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></TouchableOpacity></View>
    <AppText style={[styles.sectionLabel, { color: colors.muted }]}>ACCOUNT · {walletId ? (selectedWallet?.currency ?? currency) : `${wallets[0]?.currency ?? 'BDT'} GROUP`}</AppText>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><TouchableOpacity onPress={() => setWalletId(undefined)} style={[styles.chip, { backgroundColor: !walletId ? colors.soft : colors.card, borderColor: !walletId ? palette.blue : colors.border }]}><AppText style={{ color: !walletId ? palette.blue : colors.text, fontSize: 11, fontWeight: '600' }} localized>{`All ${wallets[0]?.currency ?? 'BDT'} wallets`}</AppText></TouchableOpacity>{wallets.map((wallet: Wallet) => <TouchableOpacity key={wallet.id} onPress={() => setWalletId(wallet.id)} style={[styles.chip, { backgroundColor: walletId === wallet.id ? colors.soft : colors.card, borderColor: walletId === wallet.id ? palette.blue : colors.border }]}><AppText style={{ color: walletId === wallet.id ? palette.blue : colors.text, fontSize: 11, fontWeight: '600' }}>{wallet.name} · {wallet.currency}</AppText></TouchableOpacity>)}</ScrollView>
    {error ? <Surface style={styles.errorCard}><Ionicons name="alert-circle-outline" size={18} color={palette.red} /><AppText style={styles.error} localized>{error}</AppText></Surface> : null}
    {loading ? <View style={styles.loading}><ActivityIndicator color={palette.blue} /><AppText style={{ color: colors.muted, fontSize: 12, marginTop: 8 }} localized>Calculating your report…</AppText></View> : report ? <>
      <View style={styles.rangeCaption}><AppText style={[styles.caption, { color: colors.muted }]}>{report.startDate} — {report.endDate}</AppText><AppText style={[styles.caption, { color: colors.muted }]} localized>{`${report.accountLabel} · ${report.transactionCount} items`}</AppText></View>
      <View style={styles.metrics}><Metric label="Income" amount={formatMinorAmount(report.incomeMinor, currency)} color={palette.green} /><Metric label="Expenses" amount={formatMinorAmount(report.expenseMinor, currency)} color={palette.red} /></View><Metric label="NET CASH FLOW" amount={formatMinorAmount(report.netMinor, currency)} color={report.netMinor >= 0 ? palette.blue : palette.red} />
      <Surface style={styles.chartCard}><View style={styles.cardHeading}><AppText style={styles.cardTitle} localized>Cash flow</AppText><View style={styles.legend}><View style={[styles.dot, { backgroundColor: palette.green }]} /><AppText style={[styles.legendText, { color: colors.muted }]} localized>In</AppText><View style={[styles.dot, { backgroundColor: palette.red }]} /><AppText style={[styles.legendText, { color: colors.muted }]} localized>Out</AppText></View></View>
        {report.timeline.length ? <View style={styles.chart}>{report.timeline.map(point => <View key={point.period} style={styles.chartColumn}><View style={styles.barPair}><View style={[styles.bar, { height: Math.max(point.incomeMinor ? 4 : 0, point.incomeMinor / maximumFlow * 100), backgroundColor: palette.green }]} /><View style={[styles.bar, { height: Math.max(point.expenseMinor ? 4 : 0, point.expenseMinor / maximumFlow * 100), backgroundColor: palette.red }]} /></View><AppText numberOfLines={1} style={[styles.chartLabel, { color: colors.muted }]}>{point.period.length === 7 ? point.period.slice(2) : point.period.slice(-5)}</AppText></View>)}</View> : <AppText style={[styles.empty, { color: colors.muted }]} localized>No income or expenses for this date range.</AppText>}
      </Surface>
      <Surface style={styles.chartCard}><View style={styles.cardHeading}><AppText style={styles.cardTitle} localized>Spending by category</AppText><AppText style={[styles.caption, { color: colors.muted }]} localized>{`${report.categories.length} categories`}</AppText></View>
        {report.categories.length ? report.categories.slice(0, 8).map(item => <View key={item.id} style={styles.categoryRow}><View style={styles.categoryHead}><View style={styles.categoryName}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={item.color} /><AppText numberOfLines={1} style={styles.categoryText}>{item.name}</AppText></View><AppText style={styles.categoryAmount}>{formatMinorAmount(item.amountMinor, currency)}</AppText></View><View style={[styles.track, { backgroundColor: colors.soft }]}><View style={[styles.fill, { width: `${Math.max(2, item.amountMinor / maxCategory * 100)}%`, backgroundColor: item.color }]} /></View></View>) : <AppText style={[styles.empty, { color: colors.muted }]} localized>No expenses to break down yet.</AppText>}
      </Surface>
      <View style={styles.exportHeading}><View><AppText style={styles.cardTitle} localized>Export this report</AppText><AppText style={[styles.caption, { color: colors.muted }]} localized>Includes all filtered transactions</AppText></View></View>
      <View style={styles.exportRow}><TouchableOpacity disabled={!!exporting} onPress={() => void exportFile('pdf')} style={[styles.exportButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="document-text-outline" size={18} color={palette.blue} />{exporting === 'pdf' ? <ActivityIndicator color={palette.blue} /> : <AppText style={styles.exportText} localized>Share PDF</AppText>}</TouchableOpacity><TouchableOpacity disabled={!!exporting} onPress={() => void exportFile('xlsx')} style={[styles.exportButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="grid-outline" size={18} color={palette.green} />{exporting === 'xlsx' ? <ActivityIndicator color={palette.green} /> : <AppText style={styles.exportText} localized>Share Excel</AppText>}</TouchableOpacity></View>
    </> : <Surface style={styles.emptyState}><Ionicons name="bar-chart-outline" size={28} color={palette.blue} /><AppText style={styles.cardTitle} localized>Your report will show here</AppText><AppText style={[styles.empty, { color: colors.muted }]} localized>Add income and expenses to see cash flow and category trends.</AppText></Surface>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 45 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 5 }, title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 }, headerIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 9, marginTop: 8 }, chips: { flexDirection: 'row', gap: 8, paddingBottom: 3 }, chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 13, minHeight: 36, justifyContent: 'center' }, dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 }, dateInput: { minWidth: 0, flex: 1, height: 43, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 9, fontSize: 11 }, apply: { width: 41, height: 41, borderRadius: 13, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center' }, rangeCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 9 }, caption: { fontSize: 10 }, metrics: { flexDirection: 'row', gap: 10, marginBottom: 10 }, metric: { flex: 1, padding: 14, marginBottom: 10 }, metricLabel: { fontSize: 9, letterSpacing: 0.8, fontWeight: '700' }, metricValue: { marginTop: 8, fontSize: 18, fontWeight: '700' }, chartCard: { padding: 15, marginTop: 5, marginBottom: 12 }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, cardTitle: { fontSize: 14, fontWeight: '700' }, legend: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendText: { fontSize: 9, marginRight: 4 }, dot: { width: 7, height: 7, borderRadius: 4 }, chart: { height: 142, flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingTop: 4 }, chartColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }, barPair: { height: 108, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }, bar: { width: 7, maxHeight: 100, borderTopLeftRadius: 4, borderTopRightRadius: 4 }, chartLabel: { width: '100%', textAlign: 'center', fontSize: 8, marginTop: 7 }, empty: { fontSize: 11, lineHeight: 17 }, categoryRow: { marginBottom: 13 }, categoryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }, categoryName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }, categoryText: { flex: 1, fontSize: 11, fontWeight: '600' }, categoryAmount: { fontSize: 11, fontWeight: '700' }, track: { height: 6, borderRadius: 4, overflow: 'hidden' }, fill: { height: 6, borderRadius: 4 }, exportHeading: { marginTop: 7, marginBottom: 11 }, exportRow: { flexDirection: 'row', gap: 10 }, exportButton: { flex: 1, minHeight: 49, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' }, exportText: { fontSize: 12, fontWeight: '700' }, loading: { alignItems: 'center', paddingVertical: 45 }, errorCard: { padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, error: { flex: 1, color: palette.red, fontSize: 11 }, emptyState: { padding: 22, alignItems: 'center', gap: 9, marginTop: 18 } });
