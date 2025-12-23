-- Migration: Pending Gumroad Purchases
-- Purpose: Store Gumroad purchases for users who haven't signed up yet
-- Auto-claim credits when they create an account with matching email

create table if not exists public.pending_gumroad_purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  gumroad_sale_id text not null unique,
  gumroad_product_id text not null,
  credits integer not null,
  currency text null,
  price_raw text null,
  license_key_partial text null,
  status text not null default 'pending', -- pending | claimed
  user_id uuid null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz null
);

create index if not exists pending_gumroad_purchases_email_idx
  on public.pending_gumroad_purchases (email);

create index if not exists pending_gumroad_purchases_status_idx
  on public.pending_gumroad_purchases (status);

create index if not exists pending_gumroad_purchases_user_id_idx
  on public.pending_gumroad_purchases (user_id);

-- Enable RLS (security)
alter table public.pending_gumroad_purchases enable row level security;

-- Admin can see all pending purchases
create policy "Admin can view all pending purchases"
  on public.pending_gumroad_purchases
  for select
  to authenticated
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email = 'lexi@chatverse.ai'
    )
  );

-- Users can see their own claimed purchases
create policy "Users can view their own purchases"
  on public.pending_gumroad_purchases
  for select
  to authenticated
  using (user_id = auth.uid());
