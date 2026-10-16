-- Host picks which /captions bottom banner shows (Both + Captions views).
-- Garden has no footer. Inquiry mode needs a live question; otherwise the TV stays on schedule.

alter table public.app_state
  add column captions_footer text not null default 'schedule'
    check (captions_footer in ('schedule', 'inquiry'));
