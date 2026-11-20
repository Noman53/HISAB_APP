-- Hisab cloud schema. Apply through the Supabase CLI or SQL migration workflow.
-- Every client-visible finance record is owned by auth.uid() and protected by RLS.

create table if not exists public.categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  kind text not null check (kind in ('income','expense')),
  icon text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id),
  unique (user_id,name,kind)
);

create table if not exists public.wallets (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  opening_balance_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  type text not null default 'cash', icon text not null default 'wallet-outline', color text not null default '#2563EB',
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);

create table if not exists public.transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('income','expense')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  title text not null,
  category_id text not null,
  wallet_id text not null,
  occurred_at date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id),
  foreign key (user_id,category_id) references public.categories(user_id,id) on delete restrict,
  foreign key (user_id,wallet_id) references public.wallets(user_id,id) on delete restrict
);

create table if not exists public.transfers (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  from_wallet_id text not null,
  to_wallet_id text not null,
  from_amount_minor bigint not null check (from_amount_minor > 0),
  to_amount_minor bigint not null check (to_amount_minor > 0),
  from_currency text not null check (from_currency ~ '^[A-Z]{3}$'),
  to_currency text not null check (to_currency ~ '^[A-Z]{3}$'),
  exchange_rate_scaled bigint not null check (exchange_rate_scaled > 0),
  rate_scale bigint not null check (rate_scale > 0),
  fee_minor bigint not null default 0 check (fee_minor >= 0),
  occurred_at date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id),
  check (from_wallet_id <> to_wallet_id),
  foreign key (user_id,from_wallet_id) references public.wallets(user_id,id) on delete restrict,
  foreign key (user_id,to_wallet_id) references public.wallets(user_id,id) on delete restrict
);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, name text not null, amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  period text not null check (period in ('weekly','monthly')),
  category_id text, starts_on date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id,id),
  foreign key (user_id,category_id) references public.categories(user_id,id) on delete set null (category_id)
);

create table if not exists public.savings_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, name text not null, target_minor bigint not null check (target_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'), target_date date, description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (user_id,id)
);

create table if not exists public.savings_contributions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, goal_id text not null, kind text not null check (kind in ('add','withdraw')),
  amount_minor bigint not null check (amount_minor > 0), occurred_at date not null, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (user_id,id),
  foreign key (user_id,goal_id) references public.savings_goals(user_id,id) on delete cascade
);

create table if not exists public.debts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, direction text not null check (direction in ('owe','owed_to_me')),
  person text not null, principal_minor bigint not null check (principal_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'), opened_on date not null, due_on date,
  interest_bps integer check (interest_bps is null or interest_bps >= 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (user_id,id)
);

create table if not exists public.debt_payments (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, debt_id text not null, amount_minor bigint not null check (amount_minor > 0), wallet_id text,
  paid_on date not null, note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id,id), foreign key (user_id,debt_id) references public.debts(user_id,id) on delete cascade,
  foreign key (user_id,wallet_id) references public.wallets(user_id,id) on delete set null (wallet_id)
);

create table if not exists public.recurring_transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, title text not null, kind text not null check (kind in ('income','expense')),
  amount_minor bigint not null check (amount_minor > 0), currency text not null check (currency ~ '^[A-Z]{3}$'),
  category_id text not null, wallet_id text not null,
  interval text not null check (interval in ('daily','weekly','monthly','yearly')),
  next_date date not null, anchor_day integer not null default 1 check (anchor_day between 1 and 31),
  anchor_month integer not null default 1 check (anchor_month between 1 and 12), end_date date,
  is_paused boolean not null default false, note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id,id), foreign key (user_id,category_id) references public.categories(user_id,id) on delete restrict,
  foreign key (user_id,wallet_id) references public.wallets(user_id,id) on delete restrict
);

create table if not exists public.recurring_occurrences (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, recurring_id text not null, occurrence_date date not null, transaction_id text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (user_id,id),
  unique (user_id,recurring_id,occurrence_date),
  foreign key (user_id,recurring_id) references public.recurring_transactions(user_id,id) on delete cascade,
  foreign key (user_id,transaction_id) references public.transactions(user_id,id) on delete restrict
);

create table if not exists public.bill_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, title text not null, amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'), due_on date not null,
  recurrence text not null check (recurrence in ('none','weekly','monthly','yearly')),
  anchor_day integer not null default 1 check (anchor_day between 1 and 31), anchor_month integer not null default 1 check (anchor_month between 1 and 12),
  wallet_id text, note text, is_archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (user_id,id),
  foreign key (user_id,wallet_id) references public.wallets(user_id,id) on delete set null (wallet_id)
);

create table if not exists public.bill_payments (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, bill_id text not null, due_on date not null, paid_on date not null, amount_minor bigint not null check (amount_minor >= 0),
  transaction_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (user_id,id),
  unique (user_id,bill_id,due_on), foreign key (user_id,bill_id) references public.bill_reminders(user_id,id) on delete cascade,
  foreign key (user_id,transaction_id) references public.transactions(user_id,id) on delete restrict
);

create table if not exists public.sync_metadata (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null, last_synced_at timestamptz, last_error text,
  primary key (user_id,device_id)
);

create table if not exists public.sync_tombstones (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null check (entity in (
    'categories','wallets','transactions','transfers','budgets','savings_goals','savings_contributions',
    'debts','debt_payments','recurring_transactions','recurring_occurrences','bill_reminders','bill_payments'
  )),
  record_id text not null,
  deleted_at timestamptz not null,
  primary key (user_id,entity,record_id)
);

create index if not exists transactions_owner_date_idx on public.transactions(user_id,occurred_at desc);
create index if not exists transactions_owner_wallet_date_idx on public.transactions(user_id,wallet_id,occurred_at desc);
create index if not exists transfers_owner_date_idx on public.transfers(user_id,occurred_at desc);
create index if not exists budgets_owner_period_idx on public.budgets(user_id,period,starts_on);
create index if not exists savings_contributions_owner_goal_date_idx on public.savings_contributions(user_id,goal_id,occurred_at desc);
create index if not exists debt_payments_owner_debt_date_idx on public.debt_payments(user_id,debt_id,paid_on desc);
create index if not exists recurring_owner_due_idx on public.recurring_transactions(user_id,next_date);
create index if not exists bill_payments_owner_bill_date_idx on public.bill_payments(user_id,bill_id,paid_on desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'categories','wallets','transactions','transfers','budgets','savings_goals','savings_contributions',
    'debts','debt_payments','recurring_transactions','recurring_occurrences','bill_reminders','bill_payments'
  ] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create policy own_rows_only on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end $$;

alter table public.sync_metadata enable row level security;
alter table public.sync_metadata force row level security;
create policy own_sync_metadata_only on public.sync_metadata for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter table public.sync_tombstones enable row level security;
alter table public.sync_tombstones force row level security;
create policy own_sync_tombstones_only on public.sync_tombstones for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.categories, public.wallets, public.transactions, public.transfers, public.budgets,
  public.savings_goals, public.savings_contributions, public.debts, public.debt_payments,
  public.recurring_transactions, public.recurring_occurrences, public.bill_reminders, public.bill_payments,
  public.sync_metadata, public.sync_tombstones from anon;
grant select, insert, update, delete on public.categories, public.wallets, public.transactions, public.transfers,
  public.budgets, public.savings_goals, public.savings_contributions, public.debts, public.debt_payments,
  public.recurring_transactions, public.recurring_occurrences, public.bill_reminders, public.bill_payments,
  public.sync_metadata, public.sync_tombstones to authenticated;
