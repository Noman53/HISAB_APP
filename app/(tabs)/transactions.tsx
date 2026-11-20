import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { DatePickerField } from '@/components/DatePickerField';
import { useLanguage } from '@/i18n/LanguageProvider';
import { Surface } from '@/components/Surface';
import { ActivityKind, ActivitySearchFilters, searchTransactionPage, searchTransferPage, Transaction, Transfer } from '@/finance/database';
import { formatMinorAmount, isValidDateOnly } from '@/finance/money';
import { useFinanceStore } from '@/finance/store';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

type Activity = {
  id: string;
  activityType: 'transaction' | 'transfer';
  kind: ActivityKind;
  title: string;
  detail: string;
  occurredAt: string;
  icon: string;
  color: string;
  amount: string;
};

const filters: ActivityKind[] = ['all', 'income', 'expense', 'transfer'];
const PAGE_SIZE = 50;

function displayDate(value: string, language: 'en' | 'bn') {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function transactionActivity(item: Transaction): Activity {
  return {
    id: item.id,
    activityType: 'transaction',
    kind: item.kind,
    title: item.title,
    detail: `${item.categoryName} · ${item.walletName}`,
    occurredAt: item.occurredAt,
    icon: item.categoryIcon,
    color: item.categoryColor,
    amount: `${item.kind === 'income' ? '+' : '−'}${formatMinorAmount(item.amountMinor, item.currency)}`,
  };
}

function transferActivity(item: Transfer): Activity {
  return {
    id: item.id,
    activityType: 'transfer',
    kind: 'transfer',
    title: `${item.fromWalletName} → ${item.toWalletName}`,
    detail: 'Wallet transfer',
    occurredAt: item.occurredAt,
    icon: 'swap-horizontal-outline',
    color: palette.blue,
    amount: `${formatMinorAmount(item.fromAmountMinor, item.fromCurrency)} → ${formatMinorAmount(item.toAmountMinor, item.toCurrency)}`,
  };
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const data = useFinanceStore(state => state.data);
  const loading = useFinanceStore(state => state.loading);
  const error = useFinanceStore(state => state.error);
  const [filter, setFilter] = useState<ActivityKind>('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [items, setItems] = useState<Activity[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const generation = useRef(0);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (nextPage: number, reset: boolean) => {
    if (loadingRef.current && !reset) return;
    const request = ++generation.current;
    loadingRef.current = true;
    setPageLoading(true);
    setPageError('');
    if (reset) {
      setItems([]);
      setHasMore(true);
    }
    const filtersForPage: ActivitySearchFilters = { query: search, kind: filter, startDate: startDate.trim(), endDate: endDate.trim(), walletId, categoryId };
    try {
      if (filtersForPage.startDate && !isValidDateOnly(filtersForPage.startDate)) throw new Error('Enter the start date as YYYY-MM-DD.');
      if (filtersForPage.endDate && !isValidDateOnly(filtersForPage.endDate)) throw new Error('Enter the end date as YYYY-MM-DD.');
      if (filtersForPage.startDate && filtersForPage.endDate && filtersForPage.startDate > filtersForPage.endDate) throw new Error('Start date must not be after end date.');
      const offset = nextPage * PAGE_SIZE;
      const [transactions, transfers] = await Promise.all([
        searchTransactionPage(filtersForPage, offset, PAGE_SIZE),
        searchTransferPage(filtersForPage, offset, PAGE_SIZE),
      ]);
      if (request !== generation.current) return;
      const pageItems = [...transactions.map(transactionActivity), ...transfers.map(transferActivity)]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      setItems(current => reset ? pageItems : [...current, ...pageItems]);
      setPage(nextPage);
      setHasMore(transactions.length === PAGE_SIZE || transfers.length === PAGE_SIZE);
    } catch (reason) {
      if (request !== generation.current) return;
      setPageError(reason instanceof Error ? reason.message : 'Could not search your local history.');
      if (reset) setItems([]);
      setHasMore(false);
    } finally {
      if (request === generation.current) {
        loadingRef.current = false;
        setPageLoading(false);
      }
    }
  }, [search, filter, startDate, endDate, walletId, categoryId]);

  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => { void loadPage(0, true); }, 200);
    return () => {
      clearTimeout(timer);
      generation.current += 1;
      loadingRef.current = false;
    };
  }, [loadPage]));

  function addTransaction() {
    Alert.alert('Add transaction', 'Choose a transaction type.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Income', onPress: () => router.push('/transaction/new?kind=income') },
      { text: 'Expense', onPress: () => router.push('/transaction/new?kind=expense') },
      { text: 'Transfer', onPress: () => router.push('/transfer/new') },
    ]);
  }

  function toggleFilter() {
    setShowFilters(value => !value);
  }

  const selectedFilters = Boolean(startDate || endDate || walletId || categoryId);
  let lastDate = '';
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View><AppText style={[styles.eyebrow, { color: colors.muted }]} localized>YOUR MONEY</AppText><AppText style={styles.heading} localized>Transactions</AppText></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add transaction" onPress={addTransaction} style={styles.add}><Ionicons name="add" color="#FFFFFF" size={24} /></TouchableOpacity>
      </View>

      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" color={colors.muted} size={18} />
        <TextInput accessibilityLabel="Search all transactions and transfers" placeholder="Search title, category, wallet, amount, note, or date" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={[styles.searchInput, { color: colors.text }]} />
        {search ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}><Ionicons name="close-circle" color={colors.muted} size={18} /></TouchableOpacity> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? palette.blue : colors.card, borderColor: filter === value ? palette.blue : colors.border }]}>
          <AppText style={{ color: filter === value ? '#FFFFFF' : colors.muted, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }} localized>{value}</AppText>
        </TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showFilters }} onPress={toggleFilter} style={[styles.filter, { backgroundColor: showFilters || selectedFilters ? colors.soft : colors.card, borderColor: showFilters || selectedFilters ? palette.blue : colors.border }]}>
          <Ionicons name="options-outline" size={15} color={showFilters || selectedFilters ? palette.blue : colors.muted} />
          <AppText style={{ color: showFilters || selectedFilters ? palette.blue : colors.muted, fontWeight: '600', fontSize: 12 }} localized>Filters</AppText>
        </TouchableOpacity>
      </ScrollView>

      {showFilters ? <Surface style={styles.advanced}>
        <AppText style={[styles.filterLabel, { color: colors.muted }]} localized>DATE RANGE</AppText>
        <View style={styles.dateFields}>
          <DatePickerField accessibilityLabel="Start date filter" value={startDate} onChange={setStartDate} allowClear compact style={styles.dateInput} />
          <DatePickerField accessibilityLabel="End date filter" value={endDate} onChange={setEndDate} allowClear compact style={styles.dateInput} />
        </View>
        <AppText style={[styles.filterLabel, { color: colors.muted }]} localized>WALLET</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All wallets" selected={!walletId} onPress={() => setWalletId('')} colors={colors} />
          {(data?.wallets ?? []).map(wallet => <FilterChip key={wallet.id} label={wallet.name} selected={walletId === wallet.id} onPress={() => setWalletId(wallet.id)} colors={colors} />)}
        </ScrollView>
        <AppText style={[styles.filterLabel, { color: colors.muted }]} localized>CATEGORY</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All categories" selected={!categoryId} onPress={() => setCategoryId('')} colors={colors} />
          {(data?.categories ?? []).map(category => <FilterChip key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} colors={colors} />)}
        </ScrollView>
        {selectedFilters ? <TouchableOpacity accessibilityRole="button" onPress={() => { setStartDate(''); setEndDate(''); setWalletId(''); setCategoryId(''); }} style={styles.clearFilters}><AppText style={{ color: palette.blue, fontSize: 11, fontWeight: '700' }} localized>Clear filters</AppText></TouchableOpacity> : null}
      </Surface> : null}

      {loading || (pageLoading && !items.length) ? <AppText style={[styles.message, { color: colors.muted }]} localized>Loading your local activity…</AppText>
        : error || pageError ? <AppText accessibilityRole="alert" style={styles.error} localized>{pageError || error}</AppText>
          : items.length === 0 ? <Surface style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.soft }]}><Ionicons name="receipt-outline" color={palette.blue} size={22} /></View>
            <AppText style={styles.emptyTitle} localized>{search || selectedFilters || filter !== 'all' ? 'No matching activity' : 'No transactions yet'}</AppText>
            <AppText style={[styles.emptyBody, { color: colors.muted }]} localized>{search || selectedFilters || filter !== 'all' ? 'Try another search or adjust your filters.' : 'Add income, expenses, or transfers to see activity here.'}</AppText>
          </Surface>
            : <View style={styles.list}>{items.map(item => {
              const showDate = item.occurredAt !== lastDate;
              lastDate = item.occurredAt;
              const onPress = () => router.push(item.activityType === 'transfer' ? `/transfer/${item.id}` : `/transaction/${item.id}`);
              return <View key={`${item.activityType}-${item.id}`}>
                {showDate ? <AppText style={[styles.dateHeading, { color: colors.muted }]}>{displayDate(item.occurredAt, language).toUpperCase()}</AppText> : null}
                <TouchableOpacity accessibilityRole="button" onPress={onPress}>
                  <Surface style={styles.row}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${item.color}18` }]}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={19} color={item.color} /></View>
                    <View style={styles.rowInfo}><AppText numberOfLines={1} style={styles.rowTitle}>{item.title}</AppText><AppText style={[styles.rowMeta, { color: colors.muted }]}>{item.detail}</AppText></View>
                    <AppText numberOfLines={1} style={[styles.amount, { color: item.kind === 'income' ? palette.green : item.kind === 'expense' ? colors.text : palette.blue }]}>{item.amount}</AppText>
                  </Surface>
                </TouchableOpacity>
              </View>;
            })}</View>}

      {hasMore && !pageError ? <TouchableOpacity accessibilityRole="button" disabled={pageLoading} onPress={() => void loadPage(page + 1, false)} style={styles.loadMore}>
        {pageLoading ? <ActivityIndicator color={palette.blue} /> : <AppText style={{ color: palette.blue, fontWeight: '700' }} localized>Load more history</AppText>}
      </TouchableOpacity> : null}
    </ScrollView>
  </SafeAreaView>;
}

function FilterChip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.soft : colors.card, borderColor: selected ? palette.blue : colors.border }]}>
    <AppText numberOfLines={1} style={{ color: selected ? palette.blue : colors.text, fontSize: 11, fontWeight: '600' }} localized>{label}</AppText>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 19 },
  eyebrow: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700', marginBottom: 4 },
  heading: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13 },
  searchInput: { flex: 1, minHeight: 46, fontSize: 13 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  filter: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, borderWidth: 1, borderRadius: radius.pill },
  advanced: { padding: 14, marginBottom: 14, gap: 7 },
  filterLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.9, marginTop: 5 },
  dateFields: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 11, fontSize: 12 },
  chips: { flexDirection: 'row', gap: 7, paddingVertical: 3 },
  chip: { maxWidth: 170, minHeight: 34, borderWidth: 1, borderRadius: radius.pill, justifyContent: 'center', paddingHorizontal: 12 },
  clearFilters: { alignSelf: 'flex-end', paddingVertical: 7 },
  list: { gap: 8 },
  loadMore: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  dateHeading: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9, marginTop: 8, marginBottom: 2 },
  row: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  categoryIcon: { height: 42, width: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '600' },
  rowMeta: { fontSize: 10, marginTop: 4 },
  amount: { fontSize: 11, fontWeight: '700', maxWidth: 145 },
  empty: { alignItems: 'center', padding: 25, marginTop: 10 },
  emptyIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyBody: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 5 },
  message: { textAlign: 'center', padding: 28 },
  error: { color: palette.red, textAlign: 'center', padding: 24 },
});
