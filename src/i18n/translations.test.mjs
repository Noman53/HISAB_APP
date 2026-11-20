import assert from 'node:assert/strict';
import test from 'node:test';
import { setActiveLanguage, translateText } from './translate.ts';

test('English remains the default and Bengali uses exact translations', () => {
  setActiveLanguage('en');
  assert.equal(translateText('No transactions yet'), 'No transactions yet');
  assert.equal(translateText('Select date'), 'Select date');
  setActiveLanguage('bn');
  assert.equal(translateText('No transactions yet'), 'এখনো কোনো লেনদেন নেই');
  assert.equal(translateText('Select date'), 'তারিখ বেছে নিন');
  assert.equal(translateText('Clear date'), 'তারিখ মুছুন');
  assert.equal(translateText('Welcome to Hisab'), 'হিসাবে স্বাগতম');
  assert.equal(translateText('Continue with Google'), 'Google দিয়ে চালিয়ে যান');
});

test('dynamic translations preserve user-provided finance content', () => {
  setActiveLanguage('bn');
  assert.equal(translateText('Groceries is your highest spending category in saved transactions.'), 'সংরক্ষিত লেনদেনে সর্বাধিক ব্যয়ের খাত হলো Groceries।');
  assert.equal(translateText('BDT 500 left'), 'BDT 500 বাকি');
  assert.equal(translateText('You send BDT 100 · They receive USD 1'), 'আপনি পাঠাচ্ছেন BDT 100 · প্রাপক পাবেন USD 1');
  assert.equal(translateText('Set rates for USD, EUR'), 'বিনিময় হার নির্ধারণ করুন: USD, EUR');
  assert.equal(translateText('3 pending local change(s)'), 'স্থানীয় পরিবর্তন অপেক্ষমাণ: 3');
});

test('unknown content is returned unchanged', () => {
  setActiveLanguage('bn');
  assert.equal(translateText('A wallet name created by the user'), 'A wallet name created by the user');
  setActiveLanguage('en');
});
