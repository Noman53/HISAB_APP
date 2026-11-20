import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSyncWinner } from './sync-math.ts';

test('offline sync conflict resolution', async t => {
  await t.test('prefers whichever edit has the later timestamp', () => {
    assert.equal(resolveSyncWinner('2026-11-20T10:00:00.000Z', '2026-11-20T09:59:00.000Z'), 'local');
    assert.equal(resolveSyncWinner('2026-11-20T10:00:00.000Z', '2026-11-20T10:01:00.000Z'), 'remote');
  });
  await t.test('keeps a newer delete as a tombstone and honors a later recreation', () => {
    assert.equal(resolveSyncWinner('2026-11-20T10:00:00.000Z', '2026-11-20T09:59:00.000Z', '2026-11-20T10:01:00.000Z'), 'deleted');
    assert.equal(resolveSyncWinner('2026-11-20T10:00:00.000Z', '2026-11-20T10:02:00.000Z', '2026-11-20T10:01:00.000Z'), 'remote');
  });
  await t.test('rejects malformed conflict timestamps', () => {
    assert.throws(() => resolveSyncWinner('not-a-date'), /timestamp is invalid/);
  });
});
