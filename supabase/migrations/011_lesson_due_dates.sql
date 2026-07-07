-- 011_lesson_due_dates.sql
-- Roadmap Phase 1, item 2: lessons had no due date at all, so students had no way to know when
-- an assignment/quiz was expected without leaving the platform. This adds an optional due_at
-- column that instructors can set at lesson creation.

alter table public.lessons add column if not exists due_at timestamptz;
