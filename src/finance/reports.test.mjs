import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportTimeline, calculateReportTotals } from './report-math.ts';

test('date-based report aggregation', async t => {
  await t.test('totals income and expenses independently and counts every included record', () => {
    assert.deepEqual(calculateReportTotals([
      { kind: 'income', amountMinor: 120000, transactionCount: 2 },
      { kind: 'expense', amountMinor: 27500, transactionCount: 3 },
    ]), { incomeMinor: 120000, expenseMinor: 27500, transactionCount: 5 });
  });
  await t.test('builds stable per-day or per-month cash-flow points', () => {
    assert.deepEqual(buildReportTimeline([
      { period: '2026-11-01', kind: 'income', amountMinor: 10000 },
      { period: '2026-11-01', kind: 'expense', amountMinor: 3500 },
      { period: '2026-11-02', kind: 'expense', amountMinor: 800 },
    ]), [
      { period: '2026-11-01', incomeMinor: 10000, expenseMinor: 3500 },
      { period: '2026-11-02', incomeMinor: 0, expenseMinor: 800 },
    ]);
  });
  await t.test('rejects totals outside the supported integer range', () => {
    assert.throws(() => calculateReportTotals([{ kind: 'income', amountMinor: Number.MAX_SAFE_INTEGER, transactionCount: 1 }, { kind: 'income', amountMinor: 1, transactionCount: 1 }]), /safe integer/);
  });
});
