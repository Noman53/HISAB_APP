import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateBalance, calculateSummary, calculateWalletBalance, convertMinorByRate, currencyDigits, formatMinorAmount, isValidDateOnly, parseAmountToMinor, parseRateToScaled, parseSignedAmountToMinor, RATE_SCALE } from './money.ts';

describe('precise currency amounts', () => {
  it('parses BDT decimal values as integer poisha', () => {
    assert.equal(parseAmountToMinor('1234.56', 'BDT'), 123456);
    assert.equal(parseAmountToMinor('1,234.5', 'BDT'), 123450);
  });
  it('rejects zero, negative, malformed, and excessive precision', () => {
    for (const value of ['0', '-1', '1.001', 'abc', '', '1,2']) assert.throws(() => parseAmountToMinor(value, 'BDT'));
  });
  it('supports currency-specific minor unit digits', () => {
    assert.equal(currencyDigits('JPY'), 0);
    assert.equal(currencyDigits('BHD'), 3);
    assert.equal(parseAmountToMinor('1.235', 'BHD'), 1235);
    assert.throws(() => parseAmountToMinor('1.5', 'JPY'));
  });
  it('guards against amounts beyond JavaScript safe integer precision', () => {
    assert.throws(() => parseAmountToMinor('90071992547409.92', 'BDT'));
  });
  it('allows signed wallet opening balances for liabilities', () => {
    assert.equal(parseSignedAmountToMinor('-250.50', 'BDT'), -25050);
    assert.equal(parseSignedAmountToMinor('0.00', 'BDT'), 0);
  });
  it('formats minor units using the requested currency', () => {
    assert.match(formatMinorAmount(250050, 'BDT'), /2,500\.50/);
  });
  it('accepts valid calendar dates and rejects impossible dates', () => {
    assert.equal(isValidDateOnly('2024-02-29'), true);
    assert.equal(isValidDateOnly('2025-02-29'), false);
    assert.equal(isValidDateOnly('2025-13-01'), false);
  });
  it('parses and applies manually entered exchange rates without floating point arithmetic', () => {
    const usdToBdt = parseRateToScaled('122');
    assert.equal(convertMinorByRate(10000, 'USD', 'BDT', usdToBdt), 1220000);
    const bdtToUsd = parseRateToScaled('0.00819672');
    assert.equal(convertMinorByRate(10000, 'BDT', 'USD', bdtToUsd), 82);
    assert.equal(convertMinorByRate(1250, 'BDT', 'BDT', RATE_SCALE), 1250);
    assert.throws(() => parseRateToScaled('0'));
    assert.throws(() => parseRateToScaled('1.123456789'));
  });
});

describe('financial summaries', () => {
  const rows = [{ kind: 'income', amountMinor: 6000000 }, { kind: 'expense', amountMinor: 1415000 }];
  it('calculates income and expenses independently', () => {
    assert.deepEqual(calculateSummary(rows), { incomeMinor: 6000000, expenseMinor: 1415000 });
  });
  it('calculates wallet balance as opening plus income less expenses', () => {
    assert.equal(calculateBalance(50000, rows), 4635000);
  });
  it('rejects negative or imprecise ledger values', () => {
    assert.throws(() => calculateSummary([{ kind: 'expense', amountMinor: -1 }]));
    assert.throws(() => calculateSummary([{ kind: 'income', amountMinor: 1.25 }]));
  });
  it('detects totals that exceed safe integer precision', () => {
    assert.throws(() => calculateSummary([{ kind: 'income', amountMinor: Number.MAX_SAFE_INTEGER }, { kind: 'income', amountMinor: 1 }]));
  });
  it('keeps transfers out of income and expenses while applying them to wallet balance', () => {
    assert.equal(calculateWalletBalance(10000, 5000, 2500, 9000, 7000), 14500);
    assert.equal(calculateWalletBalance(10000, 0, 0, 0, 0, 0, 2500), 7500);
    assert.equal(calculateWalletBalance(10000, 0, 0, 0, 0, 2500, 0), 12500);
    assert.deepEqual(calculateSummary([{ kind: 'income', amountMinor: 5000 }, { kind: 'expense', amountMinor: 2500 }]), { incomeMinor: 5000, expenseMinor: 2500 });
    assert.throws(() => calculateWalletBalance(0, 0, 0, -1, 0));
  });
});
