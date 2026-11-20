import { isValidDateOnly } from '../finance/money.ts';

function localDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}

export function dateOnlyToLocalDate(value: string, fallback = new Date()): Date {
  if (!isValidDateOnly(value)) {
    return localDate(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }
  const [year, month, day] = value.split('-').map(Number);
  return localDate(year, month - 1, day);
}

export function localDateToDateOnly(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthCalendarDays(month: Date): Array<Date | null> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = localDate(year, monthIndex, 1).getDay();
  const daysInMonth = localDate(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? localDate(year, monthIndex, day) : null;
  });
}
