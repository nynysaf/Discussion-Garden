-- Realtime filters row changes through RLS, so when a message is hidden
-- ('dismissed') the TVs never hear about it and would keep showing it.
-- Touch app_state (which every screen watches) so they re-fetch instead.
-- Hiding the pinned message also unpins it.

create or replace function public.signal_submission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.app_state
  set updated_at = now(),
      highlighted_submission_id = case
        when new.status = 'dismissed' and highlighted_submission_id = new.id then null
        else highlighted_submission_id
      end
  where id = true;
  return new;
end;
$$;

revoke execute on function public.signal_submission_change() from public, anon, authenticated;

create trigger audience_submissions_signal
  after update of status on public.audience_submissions
  for each row
  when (old.status is distinct from new.status)
  execute function public.signal_submission_change();
