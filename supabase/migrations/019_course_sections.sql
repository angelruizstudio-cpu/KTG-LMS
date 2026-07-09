-- 019_course_sections.sql
-- Roadmap Phase A2 (academic structure, continued): course sections — multiple groups of the same
-- course, each with its own instructor and optional capacity, sharing the course's content
-- (lessons/modules/quizzes stay at the course level; only roster and section-scoped grading differ).
--
-- Design decisions confirmed with the product owner:
--   - Content (lessons/modules/quizzes) is shared across all sections of a course.
--   - enrollments.section_id is an ADDITIONAL reference alongside enrollments.course_id (not a
--     replacement) — course_id keeps working everywhere it already does (progress, certificates,
--     gradebook, the inactivity job, etc.); section_id only adds a finer-grained roster/grading
--     scope on top. It is nullable: existing enrollment-granting flows keep working unchanged for
--     courses that don't need multiple sections, without forcing a section choice everywhere.
--   - Gradebook/roster visibility is isolated per section for section instructors, via a join
--     against enrollments (no section_id added to gradebook_entries itself).
--   - Existing courses get one auto-created "Section A" with instructor_id = courses.created_by,
--     and existing enrollments are re-pointed to it, so nothing changes for current users.

create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  unique (course_id, name)
);

create index course_sections_course_id_idx on public.course_sections(course_id);

alter table public.enrollments add column if not exists section_id uuid references public.course_sections(id) on delete set null;

create index enrollments_section_id_idx on public.enrollments(section_id);

-- Backfill: one default section per existing course, owned by the course's original instructor.
insert into public.course_sections (course_id, instructor_id, name)
select id, created_by, 'Section A'
from public.courses
on conflict (course_id, name) do nothing;

update public.enrollments
set section_id = course_sections.id
from public.course_sections
where enrollments.section_id is null
  and enrollments.course_id = course_sections.course_id
  and course_sections.name = 'Section A';

alter table public.course_sections enable row level security;

create or replace function public.is_section_instructor(section_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_sections
    join public.courses on courses.id = course_sections.course_id
    where course_sections.id = section_uuid
      and courses.tenant_id = public.current_tenant_id()
      and (course_sections.instructor_id = auth.uid() or public.is_admin())
  )
$$;

-- Any tenant member may view sections (needed to pick/see one); only the course's owning
-- instructor or an admin manages the section list itself.
create policy "Tenant members view course sections"
on public.course_sections for select
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_sections.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);

create policy "Course owners manage sections"
on public.course_sections for all
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_sections.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(course_sections.course_id)
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = course_sections.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(course_sections.course_id)
  )
);

-- Additive: a section instructor (who may not be the course's overall owner) can see the roster
-- of their own section, without being granted the course owner's full enrollments access.
create policy "Section instructors view their section roster"
on public.enrollments for select
using (section_id is not null and public.is_section_instructor(section_id));

-- Additive: a section instructor can grade only the students enrolled in their own section,
-- derived via a join against enrollments (gradebook_entries has no section_id of its own).
create policy "Section instructors manage their section gradebook"
on public.gradebook_entries for all
using (
  exists (
    select 1
    from public.enrollments
    where enrollments.course_id = gradebook_entries.course_id
      and enrollments.student_id = gradebook_entries.student_id
      and enrollments.section_id is not null
      and public.is_section_instructor(enrollments.section_id)
  )
)
with check (
  exists (
    select 1
    from public.enrollments
    where enrollments.course_id = gradebook_entries.course_id
      and enrollments.student_id = gradebook_entries.student_id
      and enrollments.section_id is not null
      and public.is_section_instructor(enrollments.section_id)
  )
);

-- Additive: a section instructor may grade assignment submissions from their own section's
-- students (same join shape as the existing "Instructors grade assignments" course-owner policy).
create policy "Section instructors grade their section assignments"
on public.assignment_submissions for update
using (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    join public.enrollments on enrollments.course_id = course_modules.course_id and enrollments.student_id = assignment_submissions.student_id
    where lessons.id = assignment_submissions.lesson_id
      and enrollments.section_id is not null
      and public.is_section_instructor(enrollments.section_id)
  )
)
with check (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    join public.enrollments on enrollments.course_id = course_modules.course_id and enrollments.student_id = assignment_submissions.student_id
    where lessons.id = assignment_submissions.lesson_id
      and enrollments.section_id is not null
      and public.is_section_instructor(enrollments.section_id)
  )
);
