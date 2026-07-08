-- 013_inactivity_tracking.sql
-- Roadmap Phase 3: track per-enrollment activity so a daily job can alert (15 days) and
-- auto-drop (20 days) inactive students. dropped_automatically distinguishes an automatic
-- withdrawal from a manual one, so only the former shows a "Reactivate" action.

alter table public.enrollments
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists inactivity_alert_sent_at timestamptz,
  add column if not exists dropped_automatically boolean not null default false;

create index if not exists enrollments_last_activity_at_idx on public.enrollments(last_activity_at) where status = 'active';
