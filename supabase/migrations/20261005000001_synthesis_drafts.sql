-- Phase 6 — AI drafts.
-- New ideas and vines from the AI already fit garden_nodes / garden_vines
-- (status 'draft', origin 'ai'). "Mentioned again" suggestions need their own
-- small table so a host can approve them before a node grows.

create table public.garden_reinforcements (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.garden_nodes (id) on delete cascade,
  run_id uuid references public.synthesis_runs (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  rationale text,
  source_segment_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index garden_reinforcements_status on public.garden_reinforcements (status, created_at);

grant select, insert, update, delete on public.garden_reinforcements to authenticated;
alter table public.garden_reinforcements enable row level security;
create policy "hosts manage reinforcements" on public.garden_reinforcements
  for all to authenticated using ((select public.is_host())) with check ((select public.is_host()));

alter publication supabase_realtime add table public.garden_reinforcements, public.synthesis_runs;

-- Publish a draft node (optionally renamed / re-tiered first) and any of its
-- draft vines whose other end is already published.
create or replace function public.approve_garden_node(
  node_id uuid,
  new_label text default null,
  new_tier text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_host()) then
    raise exception 'Only hosts can approve garden ideas';
  end if;

  update public.garden_nodes n
  set status = 'published',
      label = coalesce(nullif(btrim(new_label), ''), n.label),
      tier = coalesce(new_tier, n.tier)
  where n.id = node_id and n.status = 'draft';
  if not found then
    raise exception 'That draft is no longer waiting';
  end if;

  update public.garden_vines v
  set status = 'published'
  where v.status = 'draft'
    and (v.source_node_id = node_id or v.target_node_id = node_id)
    and exists (
      select 1 from public.garden_nodes o
      where o.status = 'published'
        and o.id = case when v.source_node_id = node_id then v.target_node_id else v.source_node_id end
    );
end;
$$;

-- Reject a draft node; its draft vines are rejected with it. Rejected rows stay
-- so the AI isn't allowed to suggest the same idea again.
create or replace function public.reject_garden_node(node_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_host()) then
    raise exception 'Only hosts can reject garden ideas';
  end if;

  update public.garden_nodes set status = 'rejected'
  where id = node_id and status = 'draft';
  if not found then
    raise exception 'That draft is no longer waiting';
  end if;

  update public.garden_vines set status = 'rejected'
  where status = 'draft' and (source_node_id = node_id or target_node_id = node_id);
end;
$$;

-- "Mentioned again": grow the node by one and remember the new transcript sources.
create or replace function public.approve_garden_reinforcement(reinforcement_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.garden_reinforcements;
begin
  if not (select public.is_host()) then
    raise exception 'Only hosts can approve garden suggestions';
  end if;

  update public.garden_reinforcements set status = 'approved'
  where id = reinforcement_id and status = 'draft'
  returning * into r;
  if r.id is null then
    raise exception 'That suggestion is no longer waiting';
  end if;

  update public.garden_nodes n
  set weight = n.weight + 1,
      source_segment_ids = array(
        select distinct unnest(n.source_segment_ids || r.source_segment_ids)
      )
  where n.id = r.node_id;
end;
$$;

revoke execute on function public.approve_garden_node(uuid, text, text) from public, anon;
revoke execute on function public.reject_garden_node(uuid) from public, anon;
revoke execute on function public.approve_garden_reinforcement(uuid) from public, anon;
grant execute on function public.approve_garden_node(uuid, text, text) to authenticated;
grant execute on function public.reject_garden_node(uuid) to authenticated;
grant execute on function public.approve_garden_reinforcement(uuid) to authenticated;
