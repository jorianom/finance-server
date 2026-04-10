
create table users (
  id bigint primary key generated always as identity,
  email text unique not null,
  created_at timestamp with time zone default now() not null
);

create table accounts (
  id bigint primary key generated always as identity,
  user_id bigint references users (id) on delete cascade,
  bank_name text not null,
  account_type text check (account_type in ('ahorro', 'crédito')) not null,
  last_four_digits text check (length(last_four_digits) = 4),
  created_at timestamp with time zone default now() not null
);

create table imports (
  id bigint primary key generated always as identity,
  user_id bigint references users (id) on delete cascade,
  account_id bigint references accounts (id) on delete cascade,
  file_name text not null,
  file_type text check (file_type in ('csv', 'pdf')) not null,
  status text check (status in ('pending', 'processed', 'error')) not null,
  created_at timestamp with time zone default now() not null
);

create table categories (
  id bigint primary key generated always as identity,
  user_id bigint references users (id) on delete cascade,
  name text not null,
  type text check (type in ('gasto', 'ingreso')) not null
);

create table transactions (
  id bigint primary key generated always as identity,
  user_id bigint references users (id) on delete cascade,
  account_id bigint references accounts (id) on delete cascade,
  import_id bigint references imports (id) on delete set null,
  date date not null,
  description_raw text not null,
  description_clean text,
  amount numeric check (amount > 0) not null,
  type text check (type in ('debit', 'credit')) not null,
  category_id bigint references categories (id) on delete set null,
  merchant text,
  created_at timestamp with time zone default now() not null
);

create table rules (
  id bigint primary key generated always as identity,
  user_id bigint references users (id) on delete cascade,
  keyword text not null,
  category_id bigint references categories (id) on delete cascade,
  merchant_name text,
  priority int not null
);

alter table transactions
add column hash text unique;

create unique index transactions_hash_idx on transactions using btree (hash);

alter table transactions
add column auto_classified boolean not null default false;

-- Budget cycle support
ALTER TABLE users ADD COLUMN IF NOT EXISTS cycle_start_day INTEGER DEFAULT 25;
UPDATE users SET cycle_start_day = 25 WHERE id = 1;

-- Reusable function: returns the start of the billing cycle a given date belongs to
CREATE OR REPLACE FUNCTION get_cycle_start(p_date DATE, p_day INTEGER DEFAULT 25)
RETURNS DATE AS $$
BEGIN
  IF EXTRACT(DAY FROM p_date) >= p_day THEN
    RETURN DATE_TRUNC('month', p_date) + (p_day - 1) * INTERVAL '1 day';
  ELSE
    RETURN DATE_TRUNC('month', p_date) - INTERVAL '1 month' + (p_day - 1) * INTERVAL '1 day';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- Module: Debts & Amortization
-- =============================================

create table debts (
  id bigint primary key generated always as identity,
  user_id bigint references users (id) on delete cascade,
  name text not null,
  entity text not null,
  initial_balance numeric check (initial_balance > 0) not null,
  current_balance numeric check (current_balance >= 0) not null,
  monthly_rate numeric check (monthly_rate >= 0) not null,
  min_payment numeric check (min_payment > 0) not null,
  monthly_insurance numeric not null default 0,
  start_date date not null,
  linked_description text,
  status text check (status in ('active', 'paid_off')) not null default 'active',
  created_at timestamp with time zone default now() not null
);

create table debt_payments (
  id bigint primary key generated always as identity,
  debt_id bigint references debts (id) on delete cascade not null,
  cycle_start date not null,
  scheduled_amount numeric not null,
  actual_amount numeric not null,
  extra_payment numeric not null default 0,
  balance_after numeric not null,
  created_at timestamp with time zone default now() not null,
  unique (debt_id, cycle_start)
);

-- =============================================
-- Module: Budget per Cycle
-- =============================================

create table budget_items (
  id bigint primary key generated always as identity,
  user_id bigint references users (id) on delete cascade,
  cycle_start date not null,
  name text not null,
  type text check (type in ('ingreso', 'gasto')) not null,
  amount numeric check (amount >= 0) not null,
  is_fixed boolean not null default false,
  category_id bigint references categories (id) on delete set null,
  debt_id bigint references debts (id) on delete set null,
  linked_description text,
  created_at timestamp with time zone default now() not null,
  unique (user_id, cycle_start, name)
);

-- If running against an existing DB, apply just this:
-- ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS debt_id bigint REFERENCES debts(id) ON DELETE SET NULL;