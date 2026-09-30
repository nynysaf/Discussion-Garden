-- Local/dev seed. Made-up schedule text only — never real festival content.
-- Times are venue-local Eastern (EDT, UTC-4) — confirm venue time zone.

insert into public.sessions (slug, title, date, starts_at, ends_at) values
  ('day_1', 'Saturday', '2026-10-17', '2026-10-17 11:00-04', '2026-10-17 17:00-04'),
  ('day_2', 'Sunday',   '2026-10-18', '2026-10-18 11:00-04', '2026-10-18 17:00-04');

insert into public.schedule_items (session_id, title, question, starts_at, sort_order)
select s.id, v.title, v.question, v.starts_at::timestamptz, v.sort_order
from public.sessions s
join (values
  ('day_1', 'Opening circle',       'What future are you walking in with today?',      '2026-10-17 11:00-04', 1),
  ('day_1', 'Neighbourhood commons', 'What could your street share that it doesn''t yet?', '2026-10-17 12:30-04', 2),
  ('day_1', 'Closing reflections',  'What will you try this week?',                    '2026-10-17 16:15-04', 3),
  ('day_2', 'Morning garden walk',  'What grew for you overnight?',                    '2026-10-18 11:00-04', 1),
  ('day_2', 'Futures we can build', 'Which idea from yesterday deserves more light?',  '2026-10-18 13:00-04', 2),
  ('day_2', 'Harvest',              'What are you taking home from the garden?',       '2026-10-18 16:00-04', 3)
) as v(slug, title, question, starts_at, sort_order) on v.slug = s.slug;

update public.app_state
set active_session_id = (select id from public.sessions where slug = 'day_1');
