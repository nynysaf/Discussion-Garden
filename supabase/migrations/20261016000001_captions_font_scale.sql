-- Host-controlled caption size on /captions (slider on /admin).
-- Percent of the default TV size; TVs stay read-only and pick this up from app_state.

alter table public.app_state
  add column captions_font_scale integer not null default 100
    check (captions_font_scale between 75 and 175);
