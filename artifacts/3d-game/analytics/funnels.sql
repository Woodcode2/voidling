-- ═══════════════════════════════════════════════════════════════════════════
--  VOIDLING — the five questions, as SQL
-- ═══════════════════════════════════════════════════════════════════════════
--  Paste any block into the Supabase SQL editor for project
--  uzkzuxwykajzoicuxhic (Database → SQL Editor). They read the vd_events table
--  that src/proto3d/telemetry.ts fills.
--
--  Every query is scoped to app_version like '3d-%' so the retired 2D build
--  (which reports '2d-%') cannot contaminate the numbers.
--
--  Nothing here writes, and nothing here creates database objects — they are
--  read-only queries by design, so running one can never damage anything.
--  If you want them as permanent views, wrap any block in
--  `create or replace view <name> as …` yourself.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. THE DAILY PICTURE ───────────────────────────────────────────────────
-- Players, sessions, matches, session length and frame rate, one row per day.
select
  date_trunc('day', received_at)::date            as day,
  count(distinct user_id)                          as players,
  count(distinct session_id)                       as sessions,
  count(*) filter (where event = 'first_open')     as installs,
  count(*) filter (where event = 'match_start')    as matches_started,
  count(*) filter (where event = 'match_end')      as matches_finished,
  count(*) filter (where event = 'match_quit')     as matches_quit,
  count(*) filter (where event = 'shop_view')      as shop_views,
  count(*) filter (where event = 'legendary_tap')  as legendary_taps,
  round(avg((props->>'sec')::numeric) filter (where event = 'session_end'), 1) as avg_session_sec,
  round(avg((props->>'fps')::numeric) filter (where event = 'match_end'), 1)   as avg_fps
from vd_events
where app_version like '3d-%'
group by 1
order by 1 desc;


-- ── 2. WHERE DO THEY WALK OUT? ─────────────────────────────────────────────
-- Every abandoned match, bucketed by how far in it got, with the frame rate
-- at the moment they left. A spike in one bucket is a specific thing to fix;
-- a low avg_worst_fps in that bucket says the reason is performance.
select
  (width_bucket((props->>'sec')::numeric, 0, 240, 12) - 1) * 20 as from_sec,
  count(*)                                                      as quits,
  round(avg((props->>'score')::numeric))                        as avg_score,
  round(avg((props->>'form')::numeric), 2)                      as avg_form,
  round(avg((props->>'fps')::numeric), 1)                       as avg_fps,
  round(avg((props->>'low')::numeric), 1)                       as avg_worst_fps
from vd_events
where app_version like '3d-%' and event = 'match_quit'
group by 1
order by 1;


-- ── 3. DOES ANYONE WANT THE PAID SKINS? ────────────────────────────────────
-- The only demand signal that exists before the products go live in App Store
-- Connect. reached_for_it counts children who tapped BUY on a legendary.
select
  props->>'skin'                                             as skin,
  count(*) filter (where event = 'legendary_tap')             as reached_for_it,
  count(*) filter (where event = 'skin_view')                 as previewed,
  count(*) filter (where event = 'purchase_intent')           as started_buying,
  count(*) filter (where event = 'purchase_complete')         as bought,
  count(distinct user_id)                                     as players
from vd_events
where app_version like '3d-%'
  and event in ('legendary_tap', 'skin_view', 'purchase_intent', 'purchase_complete')
group by 1
order by reached_for_it desc nulls last;


-- ── 4. DO THEY COME BACK? ──────────────────────────────────────────────────
-- D1 and D7 from the day_open marker, cohorted by install day.
with firsts as (
  select user_id, min(received_at)::date as install_day
  from vd_events where app_version like '3d-%' group by 1
),
opens as (
  select distinct user_id, received_at::date as day
  from vd_events where app_version like '3d-%' and event = 'day_open'
)
select
  f.install_day,
  count(distinct f.user_id)                                          as installs,
  count(distinct o.user_id) filter (where o.day = f.install_day + 1) as d1,
  count(distinct o.user_id) filter (
    where o.day between f.install_day + 1 and f.install_day + 7)     as d7
from firsts f
left join opens o on o.user_id = f.user_id
group by 1
order by 1 desc;


-- ── 5. HOW DOES A MATCH ACTUALLY GO? ───────────────────────────────────────
-- Finished matches by finishing position. Since the field runs in lanes (see
-- LANE_FINAL in src/proto3d/rivals.ts) these rows should separate cleanly:
-- avg_score should climb steadily from 5th place to 1st. If 2nd and 4th have
-- similar scores, the ladder has drifted and wants retuning.
select
  (props->>'place')::int                            as place,
  count(*)                                          as matches,
  round(avg((props->>'score')::numeric))            as avg_score,
  round(avg((props->>'eaten')::numeric))            as avg_eaten,
  round(avg((props->>'pct')::numeric), 1)           as avg_island_pct,
  round(avg((props->>'form')::numeric), 2)          as avg_biggest_form,
  round(avg((props->>'sec')::numeric))              as avg_sec
from vd_events
where app_version like '3d-%' and event = 'match_end' and props ? 'place'
group by 1
order by 1;


-- ── 6. THE FIRST-SESSION FUNNEL ────────────────────────────────────────────
-- Of everyone who ever opened the game, how many got to each step? The
-- steepest drop is the next thing to work on.
with u as (select distinct user_id from vd_events where app_version like '3d-%')
select
  (select count(*) from u)                                                  as opened,
  count(distinct user_id) filter (where event = 'play_tap')                 as tapped_play,
  count(distinct user_id) filter (where event = 'match_start')              as started_a_match,
  count(distinct user_id) filter (where event = 'match_end')                as finished_one,
  count(distinct user_id) filter (where event = 'evolve')                   as evolved_once,
  count(distinct user_id) filter (where (props->>'form')::int >= 3)         as reached_devourer,
  count(distinct user_id) filter (where event = 'shop_view')                as saw_the_shop,
  count(distinct user_id) filter (where event = 'skin_buy')                 as bought_a_skin
from vd_events
where app_version like '3d-%';


-- ── 7. WHICH WORLD, AND WHICH DEVICE ───────────────────────────────────────
select
  props->>'world'                                   as world,
  count(*) filter (where event = 'match_start')      as started,
  count(*) filter (where event = 'match_end')        as finished,
  count(*) filter (where event = 'match_quit')       as quit,
  round(avg((props->>'fps')::numeric) filter (where event = 'match_end'), 1) as avg_fps
from vd_events
where app_version like '3d-%' and props ? 'world'
group by 1
order by started desc;

select
  props->>'cores'   as cpu_cores,
  props->>'mem'     as device_gb,
  count(*)          as devices
from vd_events
where app_version like '3d-%' and event = 'device'
group by 1, 2
order by devices desc;
