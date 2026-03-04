-- ============================================================
-- Kayan — Personal Network CRM
-- Run this in your Supabase SQL editor
-- ============================================================

-- Contacts
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  photo_url text,
  category text,
  how_we_met text,
  notes text,
  last_touched_at timestamptz,
  last_touched_note text,
  email text,
  phone text,
  birthday date,
  instagram text,
  twitter text,
  linkedin text,
  tiktok text,
  follow_up_at date,
  archived boolean default false not null
);

-- Tags
create table if not exists contact_tags (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts(id) on delete cascade not null,
  tag text not null
);

-- Offers (what this person brings)
create table if not exists contact_offers (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts(id) on delete cascade not null,
  text text not null
);

-- Needs (what this person is looking for)
create table if not exists contact_needs (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts(id) on delete cascade not null,
  text text not null
);

-- Interactions (touchpoint log)
create table if not exists interactions (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts(id) on delete cascade not null,
  note text not null,
  date timestamptz default now() not null,
  type text default 'other' not null
);

-- ============================================================
-- Row Level Security
-- Single-user app: just require an authenticated session
-- ============================================================

alter table contacts enable row level security;
alter table contact_tags enable row level security;
alter table contact_offers enable row level security;
alter table contact_needs enable row level security;
alter table interactions enable row level security;

-- Contacts
create policy "Authenticated users can do everything on contacts"
  on contacts for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Tags
create policy "Authenticated users can do everything on contact_tags"
  on contact_tags for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Offers
create policy "Authenticated users can do everything on contact_offers"
  on contact_offers for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Needs
create policy "Authenticated users can do everything on contact_needs"
  on contact_needs for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Interactions
create policy "Authenticated users can do everything on interactions"
  on interactions for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ============================================================
-- Useful indexes for performance
-- ============================================================
create index if not exists contacts_last_touched_at_idx on contacts(last_touched_at);
create index if not exists contacts_created_at_idx on contacts(created_at desc);
create index if not exists contacts_birthday_idx on contacts(
  extract(month from birthday),
  extract(day from birthday)
);
create index if not exists contact_offers_text_idx on contact_offers using gin(to_tsvector('english', text));
create index if not exists contact_needs_text_idx on contact_needs using gin(to_tsvector('english', text));

-- ============================================================
-- If you already ran the initial schema, run these ALTER statements:
-- ============================================================
-- alter table contacts add column if not exists email text;
-- alter table contacts add column if not exists phone text;
-- alter table contacts add column if not exists birthday date;
-- alter table contacts add column if not exists instagram text;
-- alter table contacts add column if not exists twitter text;
-- alter table contacts add column if not exists linkedin text;
-- alter table contacts add column if not exists tiktok text;
-- alter table contacts add column if not exists follow_up_at date;
-- alter table contacts add column if not exists archived boolean default false not null;
-- alter table interactions add column if not exists type text default 'other' not null;

-- ============================================================
-- Storage: run separately in the Supabase dashboard
-- ============================================================
-- 1. Go to Storage → Create bucket → name: "contact-photos" → Public: ON
-- 2. The app will upload directly from the browser to this bucket
