import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { FinanceReport } from './database';
import { currencyDigits, formatMinorAmount } from './money';

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char); }
function fileBase(report: FinanceReport) { return `hisab-report-${report.startDate}-to-${report.endDate}`; }

export async function shareReportPdf(report: FinanceReport) {
  const amount = (minor: number) => escapeHtml(formatMinorAmount(minor, report.currency));
  const categoryRows = report.categories.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${item.transactionCount}</td><td>${amount(item.amountMinor)}</td></tr>`).join('');
  const transactionRows = report.transactions.map(item => `<tr><td>${escapeHtml(item.occurredAt)}</td><td>${escapeHtml(item.kind)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.categoryName)}</td><td>${escapeHtml(item.walletName)}</td><td>${amount(item.kind === 'expense' ? -item.amountMinor : item.amountMinor)}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:28px}h1{font-size:24px}h2{font-size:16px;margin-top:28px}.range{color:#64748b}.summary{display:flex;gap:18px;margin:22px 0}.metric{padding:14px;border:1px solid #e2e8f0;border-radius:12px;flex:1}.label{font-size:10px;color:#64748b;text-transform:uppercase}.value{font-size:18px;font-weight:bold;margin-top:8px}table{width:100%;border-collapse:collapse;font-size:10px}td,th{text-align:left;padding:8px 6px;border-bottom:1px solid #e2e8f0}th{color:#64748b}</style></head><body><h1>Hisab financial report</h1><div class="range">${report.startDate} to ${report.endDate} · ${escapeHtml(report.accountLabel)} · ${escapeHtml(report.currency)}</div><div class="summary"><div class="metric"><div class="label">Income</div><div class="value">${amount(report.incomeMinor)}</div></div><div class="metric"><div class="label">Expenses</div><div class="value">${amount(report.expenseMinor)}</div></div><div class="metric"><div class="label">Net</div><div class="value">${amount(report.netMinor)}</div></div></div><h2>Expense categories</h2><table><thead><tr><th>Category</th><th>Items</th><th>Total</th></tr></thead><tbody>${categoryRows || '<tr><td colspan="3">No expenses in this period.</td></tr>'}</tbody></table><h2>Transactions (${report.transactionCount})</h2><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Wallet</th><th>Amount</th></tr></thead><tbody>${transactionRows || '<tr><td colspan="6">No transactions in this period.</td></tr>'}</tbody></table></body></html>`;
  const file = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Share financial report', UTI: 'com.adobe.pdf' });
}

export async function shareReportExcel(report: FinanceReport) {
  const workbook = XLSX.utils.book_new();
  const major = (amountMinor: number) => amountMinor / (10 ** currencyDigits(report.currency));
  const summary = [
    { Metric: 'Start date', Value: report.startDate }, { Metric: 'End date', Value: report.endDate }, { Metric: 'Account', Value: report.accountLabel }, { Metric: 'Currency', Value: report.currency },
    { Metric: 'Income', Amount: major(report.incomeMinor) }, { Metric: 'Expenses', Amount: major(report.expenseMinor) }, { Metric: 'Net', Amount: major(report.netMinor) }, { Metric: 'Transactions', Value: report.transactionCount },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Summary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.categories.map(item => ({ Category: item.name, Transactions: item.transactionCount, Currency: report.currency, Amount: major(item.amountMinor), AmountMinor: item.amountMinor }))), 'Expenses by category');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.transactions.map(item => ({ Date: item.occurredAt, Type: item.kind, Title: item.title, Category: item.categoryName, Wallet: item.walletName, Currency: item.currency, Amount: major(item.kind === 'expense' ? -item.amountMinor : item.amountMinor), AmountMinor: item.kind === 'expense' ? -item.amountMinor : item.amountMinor, Note: item.note ?? '' }))), 'Transactions');
  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const uri = `${FileSystem.cacheDirectory}${fileBase(report)}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Share Excel report', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}
