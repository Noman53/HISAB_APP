import * as Notifications from 'expo-notifications';
import { claimBudgetAlert, isBudgetAlertsEnabled, loadBudgets, releaseBudgetAlert } from '@/finance/database';

function periodKey(period: 'weekly' | 'monthly') {
  const date = new Date();
  if (period === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

export async function enableBudgetNotifications() {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notification permission was not granted. You can enable it in device settings.');
  if (process.env.EXPO_OS === 'android') await Notifications.setNotificationChannelAsync('budget-alerts', { name: 'Budget alerts', importance: Notifications.AndroidImportance.DEFAULT });
}

export async function checkBudgetThresholds() {
  try {
    if (!await isBudgetAlertsEnabled()) return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    const budgets = await loadBudgets();
    for (const budget of budgets) {
      const threshold: 80 | 100 | null = budget.percentUsed >= 100 ? 100 : budget.percentUsed >= 80 ? 80 : null;
      if (!threshold) continue;
      const key = periodKey(budget.period);
      if (!await claimBudgetAlert(budget.id, key, threshold)) continue;
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title: threshold === 100 ? 'Budget limit reached' : 'Budget nearly used', body: `${budget.name}: ${Math.round(budget.percentUsed)}% used`, data: { hisabBudgetAlert: true, budgetId: budget.id }, ...(process.env.EXPO_OS === 'android' ? { channelId: 'budget-alerts' } : {}) },
          trigger: null,
        });
      } catch (error) { await releaseBudgetAlert(budget.id, key, threshold); throw error; }
    }
  } catch { /* Notifications must never prevent saving a ledger entry. */ }
}
