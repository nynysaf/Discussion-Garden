-- Live inquiries are separate from the timed schedule: a quick log the host can
-- prep ahead, switch mid-talk, and revisit. Activations feed the transcript export.

create table public.live_inquiries (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) between 1 and 200),
  session_id uuid references public.sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  last_activated_at timestamptz
);

create table public.live_inquiry_activations (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.live_inquiries (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  activated_at timestamptz not null default now()
);

create index live_inquiries_session_created on public.live_inquiries (session_id, created_at);
create index live_inquiry_activations_session_time
  on public.live_inquiry_activations (session_id, activated_at);

alter table public.app_state
  add column active_live_inquiry_id uuid references public.live_inquiries (id) on delete set null;

grant select on public.live_inquiries to anon, authenticated;
grant select, insert, update, delete on public.live_inquiries to authenticated;
grant select on public.live_inquiry_activations to authenticated;
grant insert, delete on public.live_inquiry_activations to authenticated;

alter table public.live_inquiries enable row level security;
alter table public.live_inquiry_activations enable row level security;

-- TVs need the body of whatever is live (and the list is small).
create policy "public reads live inquiries" on public.live_inquiries
  for select to anon, authenticated using (true);
create policy "hosts manage live inquiries" on public.live_inquiries
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));

create policy "hosts read activations" on public.live_inquiry_activations
  for select to authenticated using ((select public.is_host()));
create policy "hosts write activations" on public.live_inquiry_activations
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));

alter publication supabase_realtime add table public.live_inquiries;
