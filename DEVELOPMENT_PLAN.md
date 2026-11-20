# Hisab Development Plan

## Phase 1 — Project Foundation (foundation complete)
- [x] Inspect the repository; workspace was empty.
- [x] Establish Expo, TypeScript, Expo Router, and cross-platform app configuration.
- [x] Add a centralized light/dark/system design system and reusable components.
- [x] Build a navigable starter dashboard with honest empty states (no demo financial data).
- [x] Install dependencies and run the Expo/TypeScript checks.

## Phase 2 — Core Financial Features (in progress)
- [x] Local-first SQLite ledger with a versioned schema, stable record IDs, and default guest wallet/categories.
- [x] Validated BDT income and expense entry; edit and delete transactions.
- [x] Search, transaction type filters, details, and delete confirmation.
- [x] Integer minor-unit calculation layer and data-backed dashboard totals.
- [x] Finance unit tests for amount parsing, currency precision, date validation, summaries, and balance calculation.
- [ ] Authentication and guest-data migration flows are implemented in Phase 6; configure Supabase and run live account tests before treating this requirement as verified.
- [x] Add 50-record pagination for transaction and transfer history.

## Phase 3 — Wallets and Currency (in progress)
- [x] Create/edit multiple wallets with opening balances, account types, and wallet-specific currencies.
- [x] View wallet balances and wallet-specific income, expenses, and transfer history.
- [x] Record atomic transfers; transfer fees post as separate expenses.
- [x] Store manually entered exchange rates and both currency amounts on cross-currency transfers.
- [x] Keep transfer amounts out of income/expense totals and use integer minor-unit conversion with half-up rounding.
- [x] Record transfer fees as separate expense entries and keep transfer creation/deletion atomic.
- [x] Configure a manual base currency and per-wallet-currency valuation rates for one combined portfolio balance.

## Phase 4 — Planning Features (local workflows implemented)
- [x] Weekly and monthly budgets, optional category scope, and live spend progress.
- [x] Savings goals with contributions and withdrawals; goal progress is tracking-only and does not move wallet money.
- [x] Debt owed and debt owed-to-me records with partial payments; linked payments adjust wallet balance without inflating income or expenses.
- [x] Recurring income/expense templates with due-date review and explicit posting; duplicate occurrence posting is prevented.
- [x] Bill reminders with due dates, payment history, and explicit mark-as-paid expense posting when a wallet is selected.
- [x] Schedule local OS notifications for upcoming bill due dates with explicit user opt-in.
- [x] Opt-in local budget threshold alerts at 80% and 100% of weekly/monthly budgets, once per threshold and period.

## Phase 5 — Reports (implemented)
- [x] Date presets and custom inclusive date ranges; choose a single wallet or the primary currency wallet group.
- [x] Data-backed income, expense, net cash flow, expense-category breakdown, and daily/monthly cash-flow charts.
- [x] Shareable PDF report with summary, category breakdown, and filtered transaction details.
- [x] True `.xlsx` workbook export with Summary, Expenses by category, and Transactions sheets.
- [ ] Validate report query and file sharing flows on physical Android/iOS devices.

## Phase 6 — Cloud and Offline Sync (implementation in progress; project not configured)
- [x] Add Supabase schema migration for finance data, ownership constraints, indexes, `sync_metadata`, and delete tombstones.
- [x] Enable RLS and authenticated-only grants across every cloud finance table; add a pgTAP user-isolation test.
- [x] Add persistent SQLite outbox triggers for inserts, updates, and deletes, including a v4 migration that queues existing guest records.
- [x] Add email/password sign-in and account creation with chunked SecureStore session persistence.
- [x] Add user-confirmed, manual two-way sync with stable-ID upserts, timestamp conflict resolution, tombstones, retryable queue errors, and an account-owner guard.
- [x] Add portable JSON backup and merge restore for all local financial records.
- [ ] Configure a real Supabase project, apply the migration, run pgTAP RLS tests, and validate real sign-in/sync.
- [x] Automatically synchronize an already-linked account when internet returns or the app becomes active.
- [x] Register a best-effort OS background task after a successful manual sync.
- [ ] Validate background task execution on physical Android/iOS; the OS controls actual scheduling and may defer work.
- [x] Add password recovery flow and secure server-side cloud account deletion function.

## Phase 7 — Final Polish
- [x] Local bill notifications and password/account management flows implemented.
- [x] Budget threshold notifications.
- [ ] Detailed accessibility/performance review and physical Android/iOS validation.
- [ ] Hosted Supabase deployment and end-to-end auth/sync/RLS validation.
- [x] Add first-run welcome, guest entry, and initial currency selection; existing ledgers bypass setup.
- [x] Add guided onboarding slides with a skippable introduction and starting currency selection.
- [x] Add a profile/settings area for local profile details, privacy disclosures, and app information.
- [x] Add a persisted English/Bangla selector and localize static app copy, validation messages, alerts, accessibility labels, tab labels, and date displays.
- [x] Persist system/light/dark appearance preference securely across app launches.
- [x] Add an opt-in biometric app lock with OS device-credential fallback; the lock gates app access but does not encrypt SQLite data.
- [x] Add opt-in notification preferences and workflows for recurring items, savings milestones, debt due dates, and a weekly report reminder.
- [x] Expand transaction search to query all local records with SQLite pagination and advanced date/category/wallet/type filters.

## Current configuration notes
- Supabase project URL and publishable key are configured in the ignored local `.env`; deployment credentials and live migration validation are still unavailable in this workspace.
- Expo SDK version declarations follow the official latest SDK reference checked on 2026-11-19. Confirm exact package compatibility with `npx expo install --check` after install.
- Local finance data remains in SQLite. Portable JSON backups are implemented but unencrypted; Supabase sync requires project URL/key and migration deployment.
- Wallet balances are shown individually by currency. The dashboard can show a base-currency portfolio total only after manual rates are entered for every other wallet currency.
- Phase 3 uses manually entered cross-currency transfer rates and keeps those rates with each transfer. Historical transfer amounts remain fixed.
- Wallet currency and opening balance are fixed after wallet creation; wallets with activity cannot be deleted.
- Transfers between unlike currencies require a user-entered rate. Wallet values remain grouped by currency in the dashboard so Hisab does not invent a portfolio conversion rate.
- Phase 1 verification: `npx expo install --check` passes; `npm run typecheck` passes.
- Phase 2 verification: `npx expo install --check`, `npm run typecheck`, and `npm run test:finance` pass.
- Phase 3 verification: finance unit tests cover wallet balance transfer effects and cross-currency conversion; Expo checks, strict TypeScript, and iOS/Android bundle exports pass.
- Phase 4 verification: `npm run typecheck`, `npm run test:finance`, and `npx expo install --check` pass; iOS and Android bundle exports pass. These are bundle checks, not simulator/device runtime tests. Web export is not configured because `react-native-web` is not installed.
- Phase 4 limitations: recurring entries require user confirmation and support weekly, monthly, or yearly cadence. Bill notifications are opt-in and scheduled for existing due dates within the next 90 days; re-enable them after changing reminders. Bills marked paid without a wallet are recorded in reminder history without creating a ledger expense. Budget notifications are opt-in and checked after transaction changes; they are not yet tested on physical devices.
- Phase 5 verification: `npm run typecheck`, `npm run test:finance`, `npx expo install --check`, and iOS/Android bundle exports pass. Export sharing requires a native device and is not runtime-verified in this workspace.
- Phase 5 currency handling: reports use the selected wallet's currency, or all wallets matching the primary wallet's currency; unlike currencies are never combined. Expense category totals exclude transfers; transfer fees remain normal expense transactions.
- Phase 6 verification: `npm run typecheck`, all 24 finance/report/sync-math tests, `npx expo install --check`, and iOS/Android bundle exports pass after the feature additions. Supabase migration/pgTAP and live auth/sync are not executed.
- Phase 6 conflict policy: sync merges by stable IDs and compares device `modified_at` with cloud `updated_at`; later timestamps win, and tombstones propagate deletes. Device clock accuracy affects conflict resolution. Automatic sync runs when connectivity returns or the foreground app resumes, after the user has linked the device via manual sync. Background task registration is implemented, but actual execution remains OS-controlled and device validation is open.
- Phase 7 localization verification: `npm run typecheck`, `npm run test:i18n`, `npm run test:finance`, `npx expo install --check`, and Android/iOS Expo bundle exports pass. English/Bangla selection and persistence are implemented; live switching and SecureStore behavior still need physical-device verification.
- Password recovery requires `hisab://reset-password` to be allow-listed in the Supabase Auth redirect URLs. Account deletion requires deploying `supabase/functions/delete-account` and setting the platform-provided `SUPABASE_SERVICE_ROLE_KEY` secret; the service-role key must never be placed in the mobile app.
- iOS and Android JavaScript bundles export successfully with Expo SDK 58. These are bundle checks, not simulator/device runtime tests.
- App-lock setup uses Expo Local Authentication; enabling it requires enrolled device biometrics, and unlocking can fall back to the device credential. Physical-device fallback behavior remains unverified.
- Planning reminders are opt-in, local-only, scheduled at 9:00 AM, and rebuilt when planning lists/settings are opened. Due reminders cover the next 90 days and are capped at the 12 nearest items; weekly summaries are reminders to open Reports rather than generated financial statements.
- npm reported 3 moderate vulnerabilities in the installed dependency tree. Review them in a dedicated dependency-security pass before release; no forced upgrades were applied.
