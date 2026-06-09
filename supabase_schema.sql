-- ============================================================
-- OutreachAI — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Profiles (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  subscription_name text default 'Free',
  subscription_status text default 'inactive',
  available_credits integer default 0,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_payment_ids text[] default '{}',
  subscription_updated_at timestamptz,
  created_at  timestamptz default now()
);

-- Run these statements once if the profiles table already exists.
alter table public.profiles add column if not exists subscription_name text default 'Free';
alter table public.profiles add column if not exists subscription_status text default 'inactive';
alter table public.profiles add column if not exists available_credits integer default 0;
alter table public.profiles add column if not exists razorpay_order_id text;
alter table public.profiles add column if not exists razorpay_payment_id text;
alter table public.profiles add column if not exists razorpay_payment_ids text[] default '{}';
alter table public.profiles add column if not exists subscription_updated_at timestamptz;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Campaigns
-- ============================================================
create table public.campaigns (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null default 'Untitled Campaign',
  job_context  text,
  tone         text default 'confident',
  status       text default 'draft',  -- draft | generated | sent | completed
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- Resumes
-- ============================================================
create table public.resumes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  raw_text      text,
  parsed_data   jsonb,   -- ParseResumeResponse shape
  created_at    timestamptz default now()
);

-- ============================================================
-- Contacts
-- ============================================================
create table public.contacts (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text,
  email       text not null,
  company     text,
  title       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- Generated Emails
-- ============================================================
create table public.generated_emails (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid references public.campaigns(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  contact_email text not null,
  contact_name  text,
  contact_company text,
  subject       text not null,
  body          text not null,
  variant       text default 'direct',
  status        text default 'draft',  -- draft | sent | failed
  sent_at       timestamptz,
  message_id    text,   -- Gmail message ID
  error         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- Credit Management Functions (RPC)
-- ============================================================

-- Deduct credits atomically. Returns updated balance.
create or replace function public.deduct_credits(u_id uuid, amount int)
returns int language plpgsql security definer as $$
declare
  remaining_credits int;
begin
  update public.profiles
  set available_credits = available_credits - amount
  where id = u_id and available_credits >= amount
  returning available_credits into remaining_credits;

  if not found then
    raise exception 'Insufficient credits';
  end if;

  return remaining_credits;
end;
$$;

-- Refund credits. Returns updated balance.
create or replace function public.refund_credits(u_id uuid, amount int)
returns int language plpgsql security definer as $$
declare
  remaining_credits int;
begin
  update public.profiles
  set available_credits = available_credits + amount
  where id = u_id
  returning available_credits into remaining_credits;

  return remaining_credits;
end;
$$;

-- ============================================================
-- RLS Policies — users only see their own data
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.campaigns       enable row level security;
alter table public.resumes         enable row level security;
alter table public.contacts        enable row level security;
alter table public.generated_emails enable row level security;

-- Profiles
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Campaigns
create policy "Users manage own campaigns"   on public.campaigns for all using (auth.uid() = user_id);

-- Resumes
create policy "Users manage own resumes"     on public.resumes for all using (auth.uid() = user_id);

-- Contacts
create policy "Users manage own contacts"    on public.contacts for all using (auth.uid() = user_id);

-- Generated emails
create policy "Users manage own emails"      on public.generated_emails for all using (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================
create index on public.campaigns       (user_id);
create index on public.resumes         (user_id);
create index on public.contacts        (campaign_id);
create index on public.generated_emails (campaign_id);
create index on public.generated_emails (user_id, status);
