-- Audience messages show on the room feed straight away (decided 2026-10-01).
-- Hosts can hide one ('dismissed') or close submissions entirely.
-- The pinned message is app_state.highlighted_submission_id; status 'highlighted' is unused.

alter table public.app_state
  add column submissions_open boolean not null default true;

alter table public.audience_submissions
  alter column status set default 'approved';

update public.audience_submissions set status = 'approved' where status = 'pending';
