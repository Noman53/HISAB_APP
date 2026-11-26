import * as BackgroundTask from 'expo-background-task';
import * as Network from 'expo-network';
import * as TaskManager from 'expo-task-manager';
import { isAutoSyncEnabled, isSyncLinkedTo } from '@/finance/database';
import { synchronizeFinance } from '@/finance/sync';
import { getSupabaseClient } from '@/services/supabase';

export const FINANCE_SYNC_TASK = 'hisab-finance-sync';

TaskManager.defineTask(FINANCE_SYNC_TASK, async ({ error }) => {
  if (error) return BackgroundTask.BackgroundTaskResult.Failed;
  try {
    const network = await Network.getNetworkStateAsync();
    if (network.isConnected !== true || network.isInternetReachable === false) return BackgroundTask.BackgroundTaskResult.Failed;
    const client = getSupabaseClient();
    if (!client) return BackgroundTask.BackgroundTaskResult.Success;
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) return BackgroundTask.BackgroundTaskResult.Failed;
    const userId = data.session?.user.id;
    if (!userId || !await isSyncLinkedTo(userId) || !await isAutoSyncEnabled(userId)) return BackgroundTask.BackgroundTaskResult.Success;
    await synchronizeFinance(userId);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundFinanceSync() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  if (await TaskManager.isTaskRegisteredAsync(FINANCE_SYNC_TASK)) return true;
  await BackgroundTask.registerTaskAsync(FINANCE_SYNC_TASK, { minimumInterval: 12 * 60 });
  return true;
}

export async function unregisterBackgroundFinanceSync() {
  if (await TaskManager.isTaskRegisteredAsync(FINANCE_SYNC_TASK)) await BackgroundTask.unregisterTaskAsync(FINANCE_SYNC_TASK);
}
