import test from 'node:test';
import assert from 'node:assert/strict';
import { crossedSavingsMilestones } from './notification-math.ts';

test('savings milestone alerts only trigger when a contribution crosses a threshold', () => {
  assert.deepEqual(crossedSavingsMilestones(40, 82), [50, 75]);
  assert.deepEqual(crossedSavingsMilestones(74, 100), [75, 100]);
});

test('savings withdrawals and repeated progress do not cross milestones', () => {
  assert.deepEqual(crossedSavingsMilestones(80, 60), []);
  assert.deepEqual(crossedSavingsMilestones(75, 90), []);
});

test('savings milestone calculation rejects invalid progress', () => {
  assert.throws(() => crossedSavingsMilestones(-1, 50), /between 0 and 100/);
  assert.throws(() => crossedSavingsMilestones(50, Number.NaN), /between 0 and 100/);
});
