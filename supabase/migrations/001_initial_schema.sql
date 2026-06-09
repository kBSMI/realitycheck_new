-- AI Reality Check / SMI production beta schema
-- Run in Supabase SQL editor or migration pipeline.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reality_checks (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  payload jsonb not null,
  smi_engine_version text generated always as (payload #>> '{smiEngineResult,engineVersion}') stored,
  resonance_sigil_id text generated always as (payload #>> '{smiEngineResult,resonanceSignature,sigilId}') stored,
  evidence_chain_hash text generated always as (payload #>> '{smiEngineResult,auditRecord,evidenceChainHash}') stored,
  created_at timestamptz not null default now()
);

create table if not exists public.improvement_checks (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  reality_check_id text references public.reality_checks(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  reality_check_id text references public.reality_checks(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  plan text not null default 'teams',
  created_at timestamptz not null default now()
);

create table if not exists public.team_reports (
  id text primary key,
  team_project_id uuid references public.team_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_credit_ledger (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  credits_delta integer not null,
  label text not null,
  external_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'stripe',
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  monthly_credits integer not null default 0,
  flags text[] not null default '{}',
  period_start timestamptz,
  period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.enterprise_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'beta',
  status text not null default 'active',
  allowed_input_modes text[] not null default '{single,batch}',
  max_records_per_batch integer not null default 250,
  max_events_per_minute integer not null default 60,
  default_sla_class text not null default 'standard',
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.enterprise_tenants(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null unique,
  label text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.smi_jobs (
  id text primary key,
  tenant_id uuid references public.enterprise_tenants(id) on delete cascade,
  status text not null default 'queued',
  input_payload jsonb not null,
  result_payload jsonb,
  sla_class text not null default 'standard',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text
);

create table if not exists public.stream_offsets (
  tenant_id uuid references public.enterprise_tenants(id) on delete cascade,
  stream_id text not null,
  last_sequence bigint not null default 0,
  last_audit_hash text,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, stream_id)
);

create table if not exists public.sla_observations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.enterprise_tenants(id) on delete cascade,
  sla_class text not null,
  duration_ms integer not null,
  within_target boolean not null,
  target_ms integer not null,
  observed_at timestamptz not null default now()
);

create table if not exists public.audit_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.enterprise_tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  reality_check_id text references public.reality_checks(id) on delete set null,
  engine_version text not null,
  resonance_sigil_id text not null,
  canonical_input_hash text not null,
  evidence_chain_hash text not null,
  server_signature text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.reality_checks enable row level security;
alter table public.improvement_checks enable row level security;
alter table public.testimonials enable row level security;
alter table public.team_projects enable row level security;
alter table public.team_reports enable row level security;
alter table public.support_credit_ledger enable row level security;
alter table public.payment_events enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.enterprise_tenants enable row level security;
alter table public.api_keys enable row level security;
alter table public.smi_jobs enable row level security;
alter table public.stream_offsets enable row level security;
alter table public.sla_observations enable row level security;
alter table public.audit_ledger_entries enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "checks_crud_own" on public.reality_checks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "improvements_crud_own" on public.improvement_checks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "testimonials_crud_own" on public.testimonials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "team_projects_owner" on public.team_projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "team_reports_user" on public.team_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "credit_ledger_select_own" on public.support_credit_ledger for select using (auth.uid() = user_id);
create policy "entitlements_select_own" on public.user_entitlements for select using (auth.uid() = user_id);
create policy "audit_ledger_select_own" on public.audit_ledger_entries for select using (auth.uid() = user_id);

-- Inserts/updates to payment_events, support_credit_ledger fulfillment rows, api_keys,
-- enterprise tenant administration, smi_jobs, stream_offsets, and server_signature fields
-- should be performed by trusted server functions using SUPABASE_SERVICE_ROLE_KEY only.
