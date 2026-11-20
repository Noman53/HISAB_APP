export type TransactionKind = 'income' | 'expense';

const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export function currencyDigits(currency: string): number {
  const code = currency.toUpperCase();
  return ZERO_DECIMAL.has(code) ? 0 : THREE_DECIMAL.has(code) ? 3 : 2;
}

export const RATE_SCALE = 100_000_000;

export function parseRateToScaled(input: string): number {
  const normalized = input.trim();
  if (!/^\d+(?:\.\d{1,8})?$/.test(normalized)) throw new Error('Enter a positive exchange rate with up to 8 decimal places.');
  const [whole, fraction = ''] = normalized.split('.');
  const scaled = BigInt(whole) * BigInt(RATE_SCALE) + BigInt((fraction + '0'.repeat(8)).slice(0, 8));
  if (scaled <= 0n || scaled > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Exchange rate is outside the supported range.');
  return Number(scaled);
}

export function convertMinorByRate(fromMinor: number, fromCurrency: string, toCurrency: string, exchangeRateScaled: number, rateScale = RATE_SCALE): number {
  if (!Number.isSafeInteger(fromMinor) || fromMinor <= 0 || !Number.isSafeInteger(exchangeRateScaled) || exchangeRateScaled <= 0 || !Number.isSafeInteger(rateScale) || rateScale <= 0) throw new Error('Transfer amount and exchange rate must be positive safe integers.');
  const numerator = BigInt(fromMinor) * BigInt(exchangeRateScaled) * (10n ** BigInt(currencyDigits(toCurrency)));
  const denominator = (10n ** BigInt(currencyDigits(fromCurrency))) * BigInt(rateScale);
  const converted = (numerator + denominator / 2n) / denominator;
  if (converted <= 0n || converted > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Converted amount is outside the supported range.');
  return Number(converted);
}

export function parseAmountToMinor(input: string, currency = 'BDT'): number {
  const digits = currencyDigits(currency);
  const normalized = input.trim().replace(/,/g, '');
  const pattern = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`);
  if (input.trim().includes(',') && !/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(input.trim())) throw new Error('Use commas only as thousands separators.');
  if (!pattern.test(normalized)) throw new Error(digits === 0 ? 'Enter a whole amount.' : `Enter a valid amount with up to ${digits} decimal places.`);
  const [whole, fraction = ''] = normalized.split('.');
  const minor = BigInt(whole) * (10n ** BigInt(digits)) + BigInt((fraction + '0'.repeat(digits)).slice(0, digits) || '0');
  if (minor <= 0n) throw new Error('Amount must be greater than zero.');
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount is too large.');
  return Number(minor);
}

export function parseSignedAmountToMinor(input: string, currency = 'BDT'): number {
  const normalized = input.trim();
  if (/^-?0(?:\.0+)?$/.test(normalized)) return 0;
  if (normalized.startsWith('-')) return -parseAmountToMinor(normalized.slice(1), currency);
  return parseAmountToMinor(normalized, currency);
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day;
}

export function formatMinorAmount(minor: number, currency = 'BDT', locale = 'en-BD'): string {
  if (!Number.isSafeInteger(minor)) throw new Error('Money must be stored as a safe integer in minor units.');
  const digits = currencyDigits(currency);
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(minor / (10 ** digits));
}

export function calculateSummary(rows: ReadonlyArray<{ kind: TransactionKind; amountMinor: number }>) {
  return rows.reduce((summary, row) => {
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor < 0) throw new Error('Transaction amounts must be non-negative safe integers.');
    if (row.kind === 'income') summary.incomeMinor += row.amountMinor;
    else summary.expenseMinor += row.amountMinor;
    if (!Number.isSafeInteger(summary.incomeMinor) || !Number.isSafeInteger(summary.expenseMinor)) throw new Error('Transaction totals exceed the safe integer range.');
    return summary;
  }, { incomeMinor: 0, expenseMinor: 0 });
}

export function calculateBalance(openingBalanceMinor: number, rows: ReadonlyArray<{ kind: TransactionKind; amountMinor: number }>): number {
  if (!Number.isSafeInteger(openingBalanceMinor)) throw new Error('Opening balance must be a safe integer in minor units.');
  const { incomeMinor, expenseMinor } = calculateSummary(rows);
  const balance = openingBalanceMinor + incomeMinor - expenseMinor;
  if (!Number.isSafeInteger(balance)) throw new Error('Calculated balance exceeds the safe integer range.');
  return balance;
}

export function calculateWalletBalance(openingBalanceMinor: number, incomeMinor: number, expenseMinor: number, incomingTransferMinor: number, outgoingTransferMinor: number, incomingDebtPaymentMinor = 0, outgoingDebtPaymentMinor = 0): number {
  if (!Number.isSafeInteger(openingBalanceMinor)) throw new Error('Opening balance must be a safe integer in minor units.');
  for (const amount of [incomeMinor, expenseMinor, incomingTransferMinor, outgoingTransferMinor, incomingDebtPaymentMinor, outgoingDebtPaymentMinor]) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Wallet activity must use non-negative safe integers.');
  }
  const balance = openingBalanceMinor + incomeMinor - expenseMinor + incomingTransferMinor - outgoingTransferMinor + incomingDebtPaymentMinor - outgoingDebtPaymentMinor;
  if (!Number.isSafeInteger(balance)) throw new Error('Calculated wallet balance exceeds the safe integer range.');
  return balance;
}
