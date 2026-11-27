import { bangla } from './translations.ts';
import type { AppLanguage } from './translations.ts';

let activeLanguage: AppLanguage = 'en';

const dynamicTranslations: Array<{ pattern: RegExp; translate: (match: RegExpExecArray) => string }> = [
  { pattern: /^Set rates for (.+)$/, translate: match => match[1] === 'wallet currencies' ? 'ওয়ালেটের মুদ্রার রেট সেট করুন' : `রেট সেট করুন: ${match[1]}` },
  { pattern: /^Enter a valid amount with up to (\d+) decimal places\.$/, translate: match => `${match[1]} ঘর পর্যন্ত দশমিকসহ সঠিক পরিমাণ লিখুন।` },
  { pattern: /^Could not create the (PDF|XLSX) report\.$/, translate: match => `${match[1]} প্রতিবেদন তৈরি করা যায়নি।` },
  { pattern: /^The backup has an invalid (.+) section\.$/, translate: match => `ব্যাকআপের ${match[1]} অংশটি সঠিক নয়।` },
  { pattern: /^Invalid (.+) record (\d+)\.$/, translate: match => `ব্যাকআপের ${match[1]} রেকর্ড ${match[2]} সঠিক নয়।` },
  { pattern: /^Invalid fields in (.+) record (\d+)\.$/, translate: match => `ব্যাকআপের ${match[1]} রেকর্ড ${match[2]}-এ সঠিক ক্ষেত্র নেই।` },
  { pattern: /^Invalid number in (.+) record (\d+)\.$/, translate: match => `ব্যাকআপের ${match[1]} রেকর্ড ${match[2]}-এ সঠিক সংখ্যা নেই।` },
  { pattern: /^(.+) is your highest spending category in saved transactions\.$/, translate: match => `সবচেয়ে বেশি খরচ হয়েছে ${match[1]} খাতে।` },
  { pattern: /^Target (.+)$/, translate: match => `লক্ষ্যের তারিখ: ${match[1]}` },
  { pattern: /^You send (.+) · They receive (.+)$/, translate: match => `আপনি পাঠাবেন ${match[1]} · অন্য পাশে যাবে ${match[2]}` },
  { pattern: /^To (.+)$/, translate: match => `প্রাপক: ${match[1]}` },
  { pattern: /^From (.+)$/, translate: match => `প্রেরক: ${match[1]}` },
  { pattern: /^(.+) over$/, translate: match => `${match[1]} বেশি` },
  { pattern: /^(.+) left$/, translate: match => `${match[1]} বাকি` },
  { pattern: /^(.+) remaining$/, translate: match => `${match[1]} বাকি` },
  { pattern: /^of (.+)$/, translate: match => `${match[1]}-এর মধ্যে` },
  { pattern: /^(\d+) pending local change\(s\)$/, translate: match => `সিঙ্ক বাকি: ${match[1]}টি পরিবর্তন` },
  { pattern: /^(\d+) categories$/, translate: match => `খাত: ${match[1]}` },
  { pattern: /^(\d+) (.+) wallet\(s\)$/, translate: match => `${match[1]}টি ${match[2]} ওয়ালেট` },
  { pattern: /^Last synced: (.+)$/, translate: match => `শেষ সিঙ্ক: ${match[1]}` },
  { pattern: /^Sync complete at (.+)\. Background sync is scheduled when the system allows\.$/, translate: match => `${match[1]}-এ সিঙ্ক হয়েছে। ফোন অনুমতি দিলে ব্যাকগ্রাউন্ডেও সিঙ্ক হবে।` },
  { pattern: /^Sync complete at (.+)\.$/, translate: match => `${match[1]}-এ সিঙ্ক হয়েছে।` },
  { pattern: /^Sync did not finish\. Your local records are still saved\.$/, translate: () => 'সিঙ্ক সম্পন্ন হয়নি। আপনার স্থানীয় তথ্য সংরক্ষিত আছে।' },
  { pattern: /^(\d+) records were merged into this device\.$/, translate: match => `${match[1]}টি রেকর্ড এই ডিভাইসে মেশানো হয়েছে।` },
  { pattern: /^(\d+) items were added or updated\.$/, translate: match => `${match[1]}টি হিসাব যোগ বা আপডেট হয়েছে।` },
  { pattern: /^Wallets will be converted to (.+) using the rates you entered\.$/, translate: match => `আপনার দেওয়া বিনিময় হার ব্যবহার করে ওয়ালেটগুলো ${match[1]} মুদ্রায় রূপান্তরিত হবে।` },
  { pattern: /^(\d+) bill reminder\(s\) scheduled for 9:00 AM on their due date, for the next 90 days\.$/, translate: match => `আগামী ৯০ দিনের জন্য ${match[1]}টি বিলের অনুস্মারক পরিশোধের দিনে সকাল ৯টায় নির্ধারিত হয়েছে।` },
  { pattern: /^(.+) · (.+) on (.+)\. This will create a local transaction\.$/, translate: match => `${match[1]} · ${match[2]}, তারিখ ${match[3]}। এটি স্থানীয় লেনদেন তৈরি করবে।` },
  { pattern: /^This confirms you paid (.+)\. Hisab will record the expense in (.+)\.$/, translate: match => `${match[1]} পেমেন্ট হয়েছে। খরচটা ${match[2]}-এ যোগ হবে।` },
  { pattern: /^This confirms you paid (.+)\. Hisab will record the expense\.$/, translate: match => `${match[1]} পেমেন্ট হয়েছে। খরচটা হিসাবে যোগ হবে।` },
  { pattern: /^Paid (.+) · Due (.+)$/, translate: match => `পরিশোধিত ${match[1]} · পরিশোধের তারিখ ${match[2]}` },
  { pattern: /^(.+) · Fee (.+)$/, translate: match => `${match[1]} · ফি ${match[2]}` },
  { pattern: /^(.+) · (\d+) items$/, translate: match => `${match[1]} · ${match[2]}টি এন্ট্রি` },
  { pattern: /^remaining · original (.+)$/, translate: match => `বাকি · মূল পরিমাণ ${match[1]}` },
  { pattern: /^Paid (.+)$/, translate: match => `পরিশোধিত ${match[1]}` },
  { pattern: /^(.+) saved$/, translate: match => `জমা: ${match[1]}` },
  { pattern: /^(.+) to go$/, translate: match => `লক্ষ্যে বাকি: ${match[1]}` },
  { pattern: /^(.+) · Due (.+)$/, translate: match => `${match[1]} · পরিশোধের তারিখ ${match[2]}` },
  { pattern: /^(.+) limit · (\d+)% used this (week|month)$/, translate: match => `${match[1]} সীমা · ${match[2]}% ব্যবহৃত (${match[3] === 'week' ? 'সপ্তাহে' : 'মাসে'})` },
  { pattern: /^(.+) WALLET BALANCE$/, translate: match => `${match[1]} ওয়ালেট ব্যালেন্স` },
  { pattern: /^PORTFOLIO VALUE · (.+)$/, translate: match => `পোর্টফোলিওর মূল্য · ${match[1]}` },
  { pattern: /^All (.+) wallets$/, translate: match => `সব ${match[1]} ওয়ালেট` },
];

export function setActiveLanguage(language: AppLanguage) {
  activeLanguage = language;
}

export function translateText(text: string, language = activeLanguage) {
  if (language === 'en') return text;
  const normalized = text.replace(/\s+/g, ' ').trim();
  const exact = bangla[normalized];
  if (exact) return exact;
  for (const entry of dynamicTranslations) {
    const match = entry.pattern.exec(normalized);
    if (match) return entry.translate(match);
  }
  return text;
}
