import * as Notifications from 'expo-notifications';
import { BillReminder } from '@/finance/database';

export async function scheduleBillNotifications(bills: BillReminder[]) {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notification permission was not granted. You can enable it in device settings.');
  if (process.env.EXPO_OS === 'android') await Notifications.setNotificationChannelAsync('bill-reminders', { name: 'Bill reminders', importance: Notifications.AndroidImportance.DEFAULT });
  const current = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(current.filter(item => item.content.data?.hisabBillReminder === true).map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  const now = new Date();
  const pending = bills.filter(bill => !bill.isArchived).filter(bill => {
    const date = new Date(`${bill.dueOn}T09:00:00`);
    return date.getTime() > now.getTime() && date.getTime() < now.getTime() + 90 * 86_400_000;
  }).slice(0, 50);
  for (const bill of pending) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Bill due today', body: bill.title, data: { hisabBillReminder: true, billId: bill.id }, ...(process.env.EXPO_OS === 'android' ? { channelId: 'bill-reminders' } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(`${bill.dueOn}T09:00:00`) },
    });
  }
  return pending.length;
}
