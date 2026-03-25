-- Drops old strict tables
drop policy if exists "Enable read access for authenticated users" on settlements;
drop policy if exists "Enable insert for authenticated users" on settlements;
drop policy if exists "Enable read access for authenticated users" on expense_splits;
drop policy if exists "Enable insert for authenticated users" on expense_splits;
drop policy if exists "Enable read access for authenticated users" on expenses;
drop policy if exists "Enable insert for authenticated users" on expenses;
drop policy if exists "Enable read access for authenticated users" on group_members;
drop policy if exists "Enable insert for authenticated users" on group_members;

drop table if exists settlements;
drop table if exists expense_splits;
drop table if exists expenses;
drop table if exists group_members;

-- 1. Create flexible group_members table
create table
  group_members (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references groups(id) on delete cascade not null,
    user_id uuid references profiles(id) on delete set null, -- Optional real user
    member_name text not null, -- Guest name or Profile Full Name
    joined_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- 2. Create Expenses matching the group member
create table
  expenses (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references groups(id) on delete cascade not null,
    paid_by uuid references group_members(id) on delete set null,
    title text not null,
    amount numeric not null check (amount > 0),
    expense_date timestamp with time zone default timezone ('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- 3. Create Expense Splits
create table
  expense_splits (
    expense_id uuid references expenses(id) on delete cascade not null,
    member_id uuid references group_members(id) on delete cascade not null,
    amount_owed numeric not null check (amount_owed >= 0),
    primary key (expense_id, member_id)
  );

-- 4. Create Settlements
create table
  settlements (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references groups(id) on delete cascade not null,
    paid_by uuid references group_members(id) on delete cascade not null,
    paid_to uuid references group_members(id) on delete cascade not null,
    amount numeric not null check (amount > 0),
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- Enable RLS
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;

-- Basic Policies (allowing all authenticated users for now)
create policy "Allow read for authenticated" on group_members for select to authenticated using (true);
create policy "Allow insert for authenticated" on group_members for insert to authenticated with check (true);

create policy "Allow read for authenticated" on expenses for select to authenticated using (true);
create policy "Allow insert for authenticated" on expenses for insert to authenticated with check (true);

create policy "Allow read for authenticated" on expense_splits for select to authenticated using (true);
create policy "Allow insert for authenticated" on expense_splits for insert to authenticated with check (true);

create policy "Allow read for authenticated" on settlements for select to authenticated using (true);
create policy "Allow insert for authenticated" on settlements for insert to authenticated with check (true);
