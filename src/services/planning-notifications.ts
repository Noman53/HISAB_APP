import * as Notifications from 'expo-notifications';
import {
  claimSavingsGoalAlert,
  loadDebts,
  loadPlanningNotificationPreferences,
  loadRecurringTransactions,
  PlanningNotificationKey,
  releaseSavingsGoalAlert,
  setPlanningNotificationPreference,
} from '@/finance/database';
import { crossedSavingsMilestones } from '@/finance/notification-math';

const MAX_SCHEDULED_DUE_REMINDERS = 12;
const MAX_DAYS_AHEAD = 90;

async function ensureNotificationPermission() {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notification permission was not granted. You can enable it in device settings.');
  if (process.env.EXPO_OS === 'android') {
    await Notifications.setNotificationChannelAsync('planning-reminders', {
      name: 'Planning reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function updatePlanningNotificationPreference(key: PlanningNotificationKey, enabled: boolean) {
  if (enabled) await ensureNotificationPermission();
  const previous = await loadPlanningNotificationPreferences();
  await setPlanningNotificationPreference(key, enabled);
  try {
    await refreshPlanningNotifications();
  } catch (reason) {
    try {
      await setPlanningNotificationPreference(key, previous[key]);
      await refreshPlanningNotifications();
    } catch (rollbackReason) {
      const originalMessage = reason instanceof Error ? reason.message : 'Notification scheduling failed.';
      const rollbackMessage = rollbackReason instanceof Error ? rollbackReason.message : 'Could not restore the previous notification schedule.';
      throw new Error(`${originalMessage} ${rollbackMessage}`);
    }
    throw reason;
  }
}

function notificationDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 9);
}

function isWithinReminderWindow(dateKey: string, now: Date) {
  const date = notificationDate(dateKey);
  return date.getTime() > now.getTime() && date.getTime() <= now.getTime() + MAX_DAYS_AHEAD * 86_400_000;
}

export async function refreshPlanningNotifications() {
  const preferences = await loadPlanningNotificationPreferences();
  const current = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(current
    .filter(item => item.content.data?.hisabPlanningNotification === true)
    .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  if (Object.values(preferences).some(Boolean)) {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) throw new Error('Notification permission is off. Enable it in device settings to receive these reminders.');
  }

  const now = new Date();
  const dueReminders: Array<{ date: Date; title: string; body: string; kind: 'recurring' | 'debt' }> = [];
  if (preferences.recurring) {
    const recurring = await loadRecurringTransactions();
    dueReminders.push(...recurring
      .filter(item => !item.isPaused && (!item.endDate || item.nextDate <= item.endDate) && isWithinReminderWindow(item.nextDate, now))
      .map(item => ({ date: notificationDate(item.nextDate), title: 'Recurring entry due today', body: item.title, kind: 'recurring' as const })));
  }
  if (preferences.debts) {
    const debts = await loadDebts();
    dueReminders.push(...debts.flatMap(item => {
      if (item.remainingMinor <= 0 || !item.dueOn || !isWithinReminderWindow(item.dueOn, now)) return [];
      return [{ date: notificationDate(item.dueOn), title: 'Debt due today', body: item.person, kind: 'debt' as const }];
    }));
  }

  dueReminders.sort((left, right) => left.date.getTime() - right.date.getTime());
  const dueItems = dueReminders.slice(0, MAX_SCHEDULED_DUE_REMINDERS);
  for (const item of dueItems) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        data: { hisabPlanningNotification: true, notificationType: item.kind },
        ...(process.env.EXPO_OS === 'android' ? { channelId: 'planning-reminders' } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date },
    });
  }

  if (preferences.weeklySummary) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your weekly summary',
        body: 'Review last week’s income, spending, and cash flow in Reports.',
        data: { hisabPlanningNotification: true, notificationType: 'weeklySummary' },
        ...(process.env.EXPO_OS === 'android' ? { channelId: 'planning-reminders' } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 9, minute: 0 },
    });
  }
  return dueItems.length + (preferences.weeklySummary ? 1 : 0);
}

export async function notifySavingsMilestones(goalId: string, goalName: string, previousPercent: number, currentPercent: number) {
  const preferences = await loadPlanningNotificationPreferences();
  if (!preferences.savings) return;
  await ensureNotificationPermission();
  for (const threshold of crossedSavingsMilestones(previousPercent, currentPercent)) {
    if (!await claimSavingsGoalAlert(goalId, threshold)) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: threshold === 100 ? 'Savings goal completed' : 'Savings milestone reached',
          body: `${goalName}: ${threshold}% complete`,
          data: { hisabPlanningNotification: true, notificationType: 'savings', goalId, threshold },
          ...(process.env.EXPO_OS === 'android' ? { channelId: 'planning-reminders' } : {}),
        },
        trigger: null,
      });
    } catch (error) {
      await releaseSavingsGoalAlert(goalId, threshold);
      throw error;
    }
  }
}
