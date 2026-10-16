-- Friday Oct 16: venue setup / opening night — captions, transcript download, garden provenance.
-- Does not reset or split the garden; same shared garden as Sat/Sun.

insert into public.sessions (slug, title, date, starts_at, ends_at)
select 'day_0', 'Friday', '2026-10-16', '2026-10-16 17:00-04', '2026-10-16 23:00-04'
where not exists (select 1 from public.sessions where slug = 'day_0');

insert into public.schedule_items (session_id, title, question, starts_at, sort_order)
select s.id, v.title, null, v.starts_at::timestamptz, v.sort_order
from public.sessions s
join (values
  ('day_0', 'Venue setup & opening', '2026-10-16 17:00-04', 1),
  ('day_0', 'Evening conversation',  '2026-10-16 19:00-04', 2)
) as v(slug, title, starts_at, sort_order) on v.slug = s.slug
where s.slug = 'day_0'
  and not exists (
    select 1 from public.schedule_items si where si.session_id = s.id
  );

-- Tonight (Fri Oct 16 venue calendar): point captions/transcripts at Friday.
update public.app_state
set active_session_id = (select id from public.sessions where slug = 'day_0')
where (timezone('America/Toronto', now()))::date = date '2026-10-16';
