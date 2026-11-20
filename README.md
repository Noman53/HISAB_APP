# Hisab — Personal Finance Manager

Hisab is a cross-platform React Native app built with Expo, TypeScript, and Expo Router. Development is organized in phases; see [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).

## Start

1. Install Node.js 22.13+ (Node 26 is supported by the selected Expo SDK).
2. Run `npm install`.
3. Run `npx expo install --check` to confirm SDK package compatibility.
4. Run `npm start` and open the project in Expo Go or a simulator.

Supabase configuration is optional for local development. Copy `.env.example` to `.env`, set the project URL and publishable key, then restart Expo. Apply `supabase/migrations/20261120000100_finance_schema.sql` to the Supabase project before creating accounts or syncing. The app does not include service-role credentials.

## Current scope

Phase 1 provides themed Expo Router tabs and reusable UI primitives. First launch includes a welcome screen and initial currency selection; existing ledgers bypass setup. Phase 2 adds an offline guest ledger using Expo SQLite, a default cash wallet and categories, income/expense creation and editing, searchable transaction history, deletion confirmation, and live dashboard calculations. Phase 3 adds multiple wallets, opening balances, account types, wallet details, internal transfers, and explicit-rate cross-currency transfers. Amounts are stored as integer minor units and no demo transactions are inserted.

Phase 4 adds weekly/monthly budgets, savings goals with contribution and withdrawal tracking, debt records with partial payments, recurring transaction templates, and bill reminders with payment history. Recurring entries post only after the user confirms a due occurrence. Linked debt payments change the wallet balance but stay separate from ordinary income and expense totals. Savings goals track progress without moving wallet funds. Marking a bill paid creates an expense only when a wallet is selected. Bill reminders, 80%/100% budget threshold alerts, recurring/debt due reminders, savings milestones, and weekly report reminders are opt-in local notifications. Planning reminders look ahead 90 days and schedule up to 12 nearest due items.

Phase 5 adds date-filtered reports with income, expenses, net cash flow, expense categories, and daily/monthly charts. Select one wallet or report on wallets in the primary wallet's currency. PDF and `.xlsx` exports include the selected date range and its transactions. Report currency groups remain separate.

Phase 6 adds email/password Supabase authentication, secure session storage, a SQLite outbox for offline changes, manual two-way sync, conflict handling with last-write-wins timestamps and delete tombstones, JSON backup/restore, password recovery, and a server-side account deletion function. The first sync merges guest records after the user confirms; the app locks a local ledger to the first account that syncs, so its data cannot be accidentally uploaded to a different account. Already-linked accounts sync on reconnect and when the app returns to the foreground. A best-effort OS background task is registered after manual sync; execution timing is controlled by the operating system and still needs device validation. Cloud sync is unavailable until the Supabase migration is applied.

Backups are unencrypted JSON files and contain sensitive financial data; store them somewhere private. Restoring merges matching IDs and keeps other local records. Email/password account creation and sign-in, password recovery, and the server-side account deletion function are implemented. RLS policies and a pgTAP isolation test are included, but need to be run against a local or hosted Supabase database before deployment.

The transaction history loads 50 transactions and 50 transfers at a time. Dashboard totals are aggregated from all saved rows in SQLite. The portfolio balance uses manual base-currency valuation rates; rates are not refreshed automatically. Currency and opening balance are fixed after wallet creation, and wallets with financial history cannot be deleted.

The optional app lock uses device biometrics with the operating system's device-credential fallback. It gates access to the app but does not encrypt the local SQLite database. First-run onboarding includes a skippable guided introduction and starting-currency selection.

The interface supports English and Bangla. Change the language under **More → Profile & privacy → Language**; the choice is stored securely on the device. Static app copy, validation messages, alerts, control accessibility labels, and date displays follow the selected language. User-entered finance names and notes remain unchanged.

## Finance checks

- `npm run typecheck`
- `npm run test:finance`
- `npm run test:i18n`
- `npx expo install --check`

## Supabase setup

1. Create a Supabase project and copy its URL and publishable key into `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy anon key is also accepted).
2. Apply the SQL migration in `supabase/migrations/` with the Supabase CLI or the SQL editor.
3. Add `hisab://reset-password` to Supabase Auth's allowed redirect URLs for password recovery.
4. Deploy `supabase/functions/delete-account` and configure the platform `SUPABASE_SERVICE_ROLE_KEY` secret for that function. Never add this key to the app's `.env`.
5. Restart Expo, open **More → Cloud account & sync**, then create an account or sign in.
6. Choose **Sync now** and confirm the guest-data merge. A backup is available under **More → Backup & restore**.

The `supabase/tests/` RLS test uses pgTAP. Run it with `supabase test db` after setting up the Supabase CLI and local database. No Supabase credentials are checked into this repository.
