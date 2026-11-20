import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_CATEGORIES, EMPTY_WALLETS, selectCategories, selectWallets } from './selectors.ts';

test('uninitialized finance selectors return stable empty arrays', () => {
  const state = { data: null };
  assert.strictEqual(selectCategories(state), EMPTY_CATEGORIES);
  assert.strictEqual(selectCategories(state), selectCategories(state));
  assert.strictEqual(selectWallets(state), EMPTY_WALLETS);
  assert.strictEqual(selectWallets(state), selectWallets(state));
});

test('finance selectors preserve arrays from loaded data', () => {
  const categories = [{ id: 'food' }];
  const wallets = [{ id: 'cash' }];
  const state = { data: { categories, wallets } };
  assert.strictEqual(selectCategories(state), categories);
  assert.strictEqual(selectWallets(state), wallets);
});
