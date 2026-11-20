import type { Category, DashboardData, Wallet } from './database.ts';

type FinanceDataState = { data: DashboardData | null };

export const EMPTY_CATEGORIES: readonly Category[] = [];
export const EMPTY_WALLETS: readonly Wallet[] = [];

export const selectCategories = (state: FinanceDataState) => state.data?.categories ?? EMPTY_CATEGORIES;
export const selectWallets = (state: FinanceDataState) => state.data?.wallets ?? EMPTY_WALLETS;
