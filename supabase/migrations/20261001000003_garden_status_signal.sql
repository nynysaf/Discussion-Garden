-- Same RLS gap as audience messages: when a published node or vine stops being
-- published, TVs never hear about it. Touch app_state so they re-fetch.

create or replace function public.signal_app_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.app_state set updated_at = now() where id = true;
  return null;
end;
$$;

revoke execute on function public.signal_app_state() from public, anon, authenticated;

create trigger garden_nodes_status_signal
  after update of status on public.garden_nodes
  for each row
  when (old.status is distinct from new.status)
  execute function public.signal_app_state();

create trigger garden_vines_status_signal
  after update of status on public.garden_vines
  for each row
  when (old.status is distinct from new.status)
  execute function public.signal_app_state();
