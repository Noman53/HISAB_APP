import assert from 'node:assert/strict';
import test from 'node:test';
import { getLaunchDestination } from './launch-routing.ts';

test('new or previously guestless users see the account choice screen once', () => {
  assert.equal(getLaunchDestination(false, null, false), '/welcome');
  assert.equal(getLaunchDestination(true, null, false), '/welcome');
});

test('guest and signed-in users resume at setup or the ledger', () => {
  assert.equal(getLaunchDestination(false, 'guest', false), '/onboarding');
  assert.equal(getLaunchDestination(true, 'guest', false), '/(tabs)');
  assert.equal(getLaunchDestination(false, null, true), '/onboarding');
  assert.equal(getLaunchDestination(true, null, true), '/(tabs)');
});
