-- /captions screen views (Phase 6B, decided 2026-10-01; Highlight added 2026-10-14).
-- The host picks a view on /admin; the TV reads these columns and works out what to show
-- itself, so it stays read-only. Auto-rotate steps through `captions_rotation` every
-- `captions_rotate_seconds`, counted from `captions_rotate_since` (so a reloaded TV lands
-- on the same view). Null seconds = auto-rotate off.

alter table public.app_state
  add column captions_layout text not null default 'both'
    check (captions_layout in ('garden', 'both', 'captions', 'highlight')),
  add column captions_rotation text[] not null
    default array['garden', 'both', 'captions', 'highlight']::text[]
    check (captions_rotation <@ array['garden', 'both', 'captions', 'highlight']::text[]),
  add column captions_rotate_seconds integer
    check (captions_rotate_seconds between 10 and 120),
  add column captions_rotate_since timestamptz;
