-- Create a table for public profiles (matches auth.users)
create table
  profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    avatar_url text,
    updated_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- Set up Row Level Security (RLS) for profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Create Groups table
create table
  groups (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    created_by uuid references profiles(id) on delete set null,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- Create Group Members table
create table
  group_members (
    group_id uuid references groups(id) on delete cascade not null,
    user_id uuid references profiles(id) on delete cascade not null,
    joined_at timestamp with time zone default timezone ('utc'::text, now()) not null,
    primary key (group_id, user_id)
  );

-- Create Expenses table
create table
  expenses (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references groups(id) on delete cascade not null,
    paid_by uuid references profiles(id) on delete set null,
    title text not null,
    amount numeric not null check (amount > 0),
    expense_date timestamp with time zone default timezone ('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- Create Expense Splits table (who owes what for this specific expense)
create table
  expense_splits (
    expense_id uuid references expenses(id) on delete cascade not null,
    user_id uuid references profiles(id) on delete cascade not null,
    amount_owed numeric not null check (amount_owed >= 0),
    primary key (expense_id, user_id)
  );

-- Create Settlements table (payments made to balance out)
create table
  settlements (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references groups(id) on delete cascade not null,
    paid_by uuid references profiles(id) on delete cascade not null,
    paid_to uuid references profiles(id) on delete cascade not null,
    amount numeric not null check (amount > 0),
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- Enable RLS on core tables (Basic setup allowing authenticated users to read/write for now)
-- Note: In production, you would restrict this to only users in the `group_members` table
alter table groups enable row level security;
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;

-- Simple policies for rapid development (must be logged in)
create policy "Enable read access for authenticated users" on groups for select to authenticated using (true);
create policy "Enable insert for authenticated users" on groups for insert to authenticated with check (true);

create policy "Enable read access for authenticated users" on group_members for select to authenticated using (true);
create policy "Enable insert for authenticated users" on group_members for insert to authenticated with check (true);

create policy "Enable read access for authenticated users" on expenses for select to authenticated using (true);
create policy "Enable insert for authenticated users" on expenses for insert to authenticated with check (true);

create policy "Enable read access for authenticated users" on expense_splits for select to authenticated using (true);
create policy "Enable insert for authenticated users" on expense_splits for insert to authenticated with check (true);

create policy "Enable read access for authenticated users" on settlements for select to authenticated using (true);
create policy "Enable insert for authenticated users" on settlements for insert to authenticated with check (true);

-- Function to automatically create a profile when a new user signs up in Supabase Auth
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
