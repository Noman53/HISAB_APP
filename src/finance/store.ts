import { create } from 'zustand';
import { checkBudgetThresholds } from '@/services/budget-notifications';
import { DashboardData, deleteTransaction, deleteTransfer, deleteWallet, loadDashboard, loadTransaction, loadTransactionsForWallet, loadTransfer, loadTransfersForWallet, loadWallet, saveTransaction, saveTransfer, saveWallet, Transaction, TransactionInput, Transfer, TransferInput, Wallet, WalletInput } from './database';

type FinanceState = { data: DashboardData | null; loading: boolean; error: string | null; initialize: () => Promise<void>; save: (input: TransactionInput) => Promise<void>; remove: (id: string) => Promise<void>; saveWallet: (input: WalletInput) => Promise<void>; removeWallet: (id: string) => Promise<void>; saveTransfer: (input: TransferInput) => Promise<void>; removeTransfer: (id: string) => Promise<void>; getTransfer: (id: string) => Promise<Transfer | null>; getWallet: (id: string) => Promise<Wallet | null>; getWalletTransactions: (id: string) => Promise<Transaction[]>; getWalletTransfers: (id: string) => Promise<Transfer[]>; getTransaction: (id: string) => Promise<Transaction | null> };
export const useFinanceStore = create<FinanceState>((set) => ({
  data: null, loading: true, error: null,
  initialize: async () => { set({ loading: true, error: null }); try { const data = await loadDashboard(); set({ data, loading: false }); } catch { set({ error: 'Could not load your data. Try again.', loading: false }); } },
  save: async input => { await saveTransaction(input); const data = await loadDashboard(); set({ data }); void checkBudgetThresholds(); },
  remove: async id => { await deleteTransaction(id); const data = await loadDashboard(); set({ data }); void checkBudgetThresholds(); },
  saveWallet: async input => { await saveWallet(input); const data = await loadDashboard(); set({ data }); },
  removeWallet: async id => { await deleteWallet(id); const data = await loadDashboard(); set({ data }); },
  saveTransfer: async input => { await saveTransfer(input); const data = await loadDashboard(); set({ data }); },
  removeTransfer: async id => { await deleteTransfer(id); const data = await loadDashboard(); set({ data }); },
  getTransfer: id => loadTransfer(id),
  getWallet: id => loadWallet(id),
  getWalletTransactions: id => loadTransactionsForWallet(id),
  getWalletTransfers: id => loadTransfersForWallet(id),
  getTransaction: id => loadTransaction(id),
}));
