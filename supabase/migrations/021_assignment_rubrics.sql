-- 021_assignment_rubrics.sql
-- Grading rubrics: instructors can define scoring criteria (name + max points) for an assignment
-- lesson so students know how they'll be graded before submitting. Criteria are informational —
-- the instructor still enters a single score/max_score when grading (existing gradebook flow is
-- unchanged); the rubric's total max points is meant to match the assignment's max score.

create table public.assignment_rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  name text not null,
  max_points integer not null check (max_points > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index assignment_rubric_criteria_lesson_id_idx on public.assignment_rubric_criteria(lesson_id);

alter table public.assignment_rubric_criteria enable row level security;

-- Any course member (enrolled student, course instructor, section instructor, or admin) can view
-- the rubric; only the course's owning instructor or an admin can manage it.
create policy "Course members view rubric criteria"
on public.assignment_rubric_criteria for select
using (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = assignment_rubric_criteria.lesson_id
      and public.is_discussion_course_member(course_modules.course_id)
  )
);

create policy "Course owners manage rubric criteria"
on public.assignment_rubric_criteria for all
using (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = assignment_rubric_criteria.lesson_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
)
with check (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = assignment_rubric_criteria.lesson_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
);
