import assert from 'node:assert/strict';
import test from 'node:test';
import { setActiveLanguage, translateText } from './translate.ts';

test('English remains the default and Bengali uses exact translations', () => {
  setActiveLanguage('en');
  assert.equal(translateText('No transactions yet'), 'No transactions yet');
  assert.equal(translateText('Select date'), 'Select date');
  setActiveLanguage('bn');
  assert.equal(translateText('No transactions yet'), 'এখনো কোনো লেনদেন নেই');
  assert.equal(translateText('Select date'), 'তারিখ বাছুন');
  assert.equal(translateText('Clear date'), 'তারিখ মুছুন');
  assert.equal(translateText('Welcome to Hisab'), 'হিসাবে স্বাগতম');
  assert.equal(translateText('Settings'), 'সেটিংস');
  assert.equal(translateText('Top spending category'), 'যে খাতে সবচেয়ে বেশি খরচ');
  assert.equal(translateText('Continue with Google'), 'Google দিয়ে সাইন ইন করুন');
  assert.equal(translateText('Continue as guest'), 'গেস্ট হিসেবে চালিয়ে যান');
  assert.equal(translateText('Plan'), 'প্ল্যান');
  assert.equal(translateText('Your money, your control'), 'টাকার হিসাব থাকুক আপনার হাতেই');
  assert.equal(translateText('Automatic sync'), 'অটো সিঙ্ক');
  assert.equal(translateText('Sync once to turn on automatic sync.'), 'একবার সিঙ্ক করলেই অটো সিঙ্ক চালু করতে পারবেন।');
  assert.equal(translateText('Your phone’s screen lock helps protect your data. Backup files aren’t encrypted, so keep them somewhere private.'), 'ফোন লক দিয়ে আপনার হিসাব সুরক্ষিত রাখুন। ব্যাকআপ ফাইলে আলাদা লক নেই, তাই নিরাপদে রাখুন।');
});

test('dynamic translations preserve user-provided finance content', () => {
  setActiveLanguage('bn');
  assert.equal(translateText('Groceries is your highest spending category in saved transactions.'), 'সবচেয়ে বেশি খরচ হয়েছে Groceries খাতে।');
  assert.equal(translateText('BDT 500 left'), 'BDT 500 বাকি');
  assert.equal(translateText('You send BDT 100 · They receive USD 1'), 'আপনি পাঠাবেন BDT 100 · অন্য পাশে যাবে USD 1');
  assert.equal(translateText('Set rates for USD, EUR'), 'রেট সেট করুন: USD, EUR');
  assert.equal(translateText('3 pending local change(s)'), 'সিঙ্ক বাকি: 3টি পরিবর্তন');
  assert.equal(translateText('3 items were added or updated.'), '3টি হিসাব যোগ বা আপডেট হয়েছে।');
});

test('unknown content is returned unchanged', () => {
  setActiveLanguage('bn');
  assert.equal(translateText('A wallet name created by the user'), 'A wallet name created by the user');
  setActiveLanguage('en');
});
