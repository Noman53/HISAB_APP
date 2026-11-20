import assert from 'node:assert/strict';
import test from 'node:test';
import { dateOnlyToLocalDate, getMonthCalendarDays, localDateToDateOnly } from './date-picker-utils.ts';

test('date-only conversion preserves calendar dates without UTC shifts', () => {
  for (const value of ['2024-02-29', '2026-01-31', '1999-12-05']) {
    assert.equal(localDateToDateOnly(dateOnlyToLocalDate(value)), value);
  }
});

test('calendar grids include the correct dates and pad to six weeks', () => {
  const february = getMonthCalendarDays(dateOnlyToLocalDate('2024-02-15'));
  assert.equal(february.length, 42);
  assert.deepEqual(february.filter(Boolean).map(localDateToDateOnly), [
    '2024-02-01', '2024-02-02', '2024-02-03', '2024-02-04', '2024-02-05', '2024-02-06', '2024-02-07',
    '2024-02-08', '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14',
    '2024-02-15', '2024-02-16', '2024-02-17', '2024-02-18', '2024-02-19', '2024-02-20', '2024-02-21',
    '2024-02-22', '2024-02-23', '2024-02-24', '2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28',
    '2024-02-29',
  ]);
  assert.equal(february[0], null);
});
