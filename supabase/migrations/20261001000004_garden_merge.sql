-- Merge a duplicate garden node into another, all-or-nothing:
-- the kept node inherits the duplicate's vines (no loops, no duplicates),
-- weight, and transcript sources; then the duplicate is deleted.
-- Runs as the caller, so the hosts-only RLS policies still apply.

create or replace function public.merge_garden_nodes(keep_id uuid, drop_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_host()) then
    raise exception 'Only hosts can merge garden ideas';
  end if;
  if keep_id = drop_id then
    raise exception 'Pick two different ideas to merge';
  end if;

  update public.garden_nodes k
  set weight = k.weight + d.weight,
      source_segment_ids = array(
        select distinct unnest(k.source_segment_ids || d.source_segment_ids)
      )
  from public.garden_nodes d
  where k.id = keep_id and d.id = drop_id;
  if not found then
    raise exception 'One of those ideas no longer exists';
  end if;

  update public.garden_vines v
  set source_node_id = keep_id
  where v.source_node_id = drop_id
    and v.target_node_id <> keep_id
    and not exists (
      select 1 from public.garden_vines e
      where (e.source_node_id = keep_id and e.target_node_id = v.target_node_id)
         or (e.target_node_id = keep_id and e.source_node_id = v.target_node_id)
    );

  update public.garden_vines v
  set target_node_id = keep_id
  where v.target_node_id = drop_id
    and v.source_node_id <> keep_id
    and not exists (
      select 1 from public.garden_vines e
      where (e.target_node_id = keep_id and e.source_node_id = v.source_node_id)
         or (e.source_node_id = keep_id and e.target_node_id = v.source_node_id)
    );

  -- Vines that would have looped or duplicated are removed with the node (on delete cascade).
  delete from public.garden_nodes where id = drop_id;
end;
$$;

revoke execute on function public.merge_garden_nodes(uuid, uuid) from public, anon;
grant execute on function public.merge_garden_nodes(uuid, uuid) to authenticated;
