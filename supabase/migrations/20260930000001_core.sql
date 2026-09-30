-- Discussion Garden core schema (PRD §6).
-- Displays and phones use the public (anon) key and only see what RLS allows.
-- Hosts are signed-in users whose email is in public.hosts.

-- ─── Hosts allowlist ────────────────────────────────────────────────────────
create table public.hosts (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.hosts enable row level security;
-- No policies: only the secret key (scripts/add-host.mjs) can read or write it.

create or replace function public.is_host()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hosts h
    where h.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_host() from public;
grant execute on function public.is_host() to anon, authenticated;

-- ─── Sessions (festival days) + schedule ────────────────────────────────────
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  title text not null,
  question text,
  starts_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index schedule_items_session_order on public.schedule_items (session_id, sort_order);

-- ─── Audience submissions (inserted by a server route, Phase 4) ─────────────
create table public.audience_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  name_tag text check (char_length(name_tag) <= 40),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'highlighted', 'dismissed')),
  device_hash text,
  created_at timestamptz not null default now()
);
create index audience_submissions_status on public.audience_submissions (status, created_at);

-- ─── App state (exactly one row) ────────────────────────────────────────────
create table public.app_state (
  id boolean primary key default true check (id),
  active_session_id uuid references public.sessions (id) on delete set null,
  active_schedule_item_id uuid references public.schedule_items (id) on delete set null,
  synthesis_mode text not null default 'manual'
    check (synthesis_mode in ('manual', 'hybrid', 'auto')),
  audio_status text not null default 'idle'
    check (audio_status in ('idle', 'connecting', 'live', 'reconnecting', 'paused', 'error')),
  garden_hidden boolean not null default false,
  speaker_colours_on boolean not null default true,
  highlighted_submission_id uuid references public.audience_submissions (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.app_state default values;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger app_state_touch before update on public.app_state
  for each row execute function public.touch_updated_at();

-- ─── Transcript (private archive) ───────────────────────────────────────────
create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  -- `${connection_id}:${start_ms}` from the host laptop; makes retries safe.
  bubble_id text not null unique,
  session_id uuid references public.sessions (id) on delete set null,
  connection_id text not null,
  speaker integer not null,
  text text not null,
  start_ms integer not null,
  end_ms integer not null,
  created_at timestamptz not null default now()
);
create index transcript_segments_session_time on public.transcript_segments (session_id, created_at);

-- ─── Garden (one festival-wide garden; no session filter) ───────────────────
create table public.garden_nodes (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('seed', 'sprout', 'theme')),
  label text not null check (char_length(label) between 1 and 80),
  description text,
  weight integer not null default 1 check (weight >= 1),
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  origin text not null default 'manual' check (origin in ('manual', 'ai')),
  origin_session_id uuid references public.sessions (id) on delete set null,
  source_segment_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger garden_nodes_touch before update on public.garden_nodes
  for each row execute function public.touch_updated_at();

create table public.garden_vines (
  id uuid primary key default gen_random_uuid(),
  source_node_id uuid not null references public.garden_nodes (id) on delete cascade,
  target_node_id uuid not null references public.garden_nodes (id) on delete cascade,
  kind text not null check (kind in ('grows_into', 'relates_to')),
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  origin text not null default 'manual' check (origin in ('manual', 'ai')),
  origin_session_id uuid references public.sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  check (source_node_id <> target_node_id)
);

create table public.synthesis_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete set null,
  window_start timestamptz,
  window_end timestamptz,
  mode text not null check (mode in ('manual', 'hybrid', 'auto')),
  raw_output jsonb,
  error text,
  created_at timestamptz not null default now()
);

-- ─── Grants (RLS below decides which rows) ──────────────────────────────────
grant select on public.sessions, public.schedule_items, public.app_state,
  public.garden_nodes, public.garden_vines, public.audience_submissions
  to anon, authenticated;
grant insert, update, delete on public.sessions, public.schedule_items,
  public.garden_nodes, public.garden_vines, public.audience_submissions
  to authenticated;
grant update on public.app_state to authenticated;
grant select, insert, update, delete on public.transcript_segments, public.synthesis_runs
  to authenticated;

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.sessions enable row level security;
alter table public.schedule_items enable row level security;
alter table public.app_state enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.garden_nodes enable row level security;
alter table public.garden_vines enable row level security;
alter table public.synthesis_runs enable row level security;
alter table public.audience_submissions enable row level security;

-- Public reads
create policy "public reads sessions" on public.sessions
  for select to anon, authenticated using (true);
create policy "public reads schedule" on public.schedule_items
  for select to anon, authenticated using (true);
create policy "public reads app state" on public.app_state
  for select to anon, authenticated using (true);
create policy "public reads published nodes" on public.garden_nodes
  for select to anon, authenticated using (status = 'published');
create policy "public reads published vines" on public.garden_vines
  for select to anon, authenticated using (status = 'published');
create policy "public reads approved submissions" on public.audience_submissions
  for select to anon, authenticated using (status in ('approved', 'highlighted'));

-- Host writes (and host-only reads of drafts, transcripts, runs, pending submissions)
create policy "hosts manage sessions" on public.sessions
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));
create policy "hosts manage schedule" on public.schedule_items
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));
create policy "hosts update app state" on public.app_state
  for update to authenticated using ((select public.is_host())) with check ((select public.is_host()));
create policy "hosts manage transcript" on public.transcript_segments
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));
create policy "hosts manage nodes" on public.garden_nodes
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));
create policy "hosts manage vines" on public.garden_vines
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));
create policy "hosts manage synthesis runs" on public.synthesis_runs
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));
create policy "hosts manage submissions" on public.audience_submissions
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));

-- ─── Realtime ───────────────────────────────────────────────────────────────
-- Row changes that TVs listen to (RLS still filters what each client receives).
alter publication supabase_realtime add table
  public.app_state, public.schedule_items, public.sessions,
  public.garden_nodes, public.garden_vines, public.audience_submissions;

-- Private broadcast channels (clients must join with `private: true`).
-- "captions": everyone may listen, only hosts may send.
create policy "anyone receives captions" on realtime.messages
  for select to anon, authenticated
  using ((select realtime.topic()) = 'captions' and extension = 'broadcast');
create policy "hosts send captions" on realtime.messages
  for insert to authenticated
  with check (
    (select realtime.topic()) = 'captions'
    and extension = 'broadcast'
    and (select public.is_host())
  );

-- "captions-hello": a display asks the host for recent bubbles after (re)connecting.
-- Harmless if abused: the host only replies with what TVs already show.
create policy "anyone receives caption hellos" on realtime.messages
  for select to anon, authenticated
  using ((select realtime.topic()) = 'captions-hello' and extension = 'broadcast');
create policy "anyone sends caption hellos" on realtime.messages
  for insert to anon, authenticated
  with check ((select realtime.topic()) = 'captions-hello' and extension = 'broadcast');
