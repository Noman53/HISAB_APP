import type { TransactionKind } from './money.ts';

export function calculateReportTotals(rows: ReadonlyArray<{ kind: TransactionKind; amountMinor: number; transactionCount: number }>) {
  return rows.reduce((totals, row) => {
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor < 0 || !Number.isSafeInteger(row.transactionCount) || row.transactionCount < 0) throw new Error('Report totals must be non-negative safe integers.');
    if (row.kind === 'income') { totals.incomeMinor += row.amountMinor; } else { totals.expenseMinor += row.amountMinor; }
    totals.transactionCount += row.transactionCount;
    if (![totals.incomeMinor, totals.expenseMinor, totals.transactionCount].every(Number.isSafeInteger)) throw new Error('Report totals exceed the safe integer range.');
    return totals;
  }, { incomeMinor: 0, expenseMinor: 0, transactionCount: 0 });
}

export function buildReportTimeline(rows: ReadonlyArray<{ period: string; kind: TransactionKind; amountMinor: number }>) {
  const periods = new Map<string, { period: string; incomeMinor: number; expenseMinor: number }>();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor < 0) throw new Error('Report amounts must be non-negative safe integers.');
    const point = periods.get(row.period) ?? { period: row.period, incomeMinor: 0, expenseMinor: 0 };
    if (row.kind === 'income') point.incomeMinor = row.amountMinor; else point.expenseMinor = row.amountMinor;
    periods.set(row.period, point);
  }
  return [...periods.values()];
}
