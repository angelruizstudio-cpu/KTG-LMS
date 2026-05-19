create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.program_courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null default 1,
  required boolean not null default true,
  available_from timestamptz,
  unique (program_id, course_id)
);

create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table if not exists public.course_prerequisites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete cascade,
  unique (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

alter table public.programs enable row level security;
alter table public.program_courses enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.course_prerequisites enable row level security;

drop policy if exists "Programs are visible to admins, instructors, and assigned students" on public.programs;
create policy "Programs are visible to admins, instructors, and assigned students"
on public.programs for select
using (
  public.current_role() in ('admin', 'instructor')
  or exists (
    select 1 from public.program_enrollments
    where program_enrollments.program_id = programs.id
      and program_enrollments.student_id = auth.uid()
      and program_enrollments.status = 'active'
  )
);

drop policy if exists "Admins manage programs" on public.programs;
create policy "Admins manage programs"
on public.programs for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Program courses are visible to assigned students and staff" on public.program_courses;
create policy "Program courses are visible to assigned students and staff"
on public.program_courses for select
using (
  public.current_role() in ('admin', 'instructor')
  or exists (
    select 1 from public.program_enrollments
    where program_enrollments.program_id = program_courses.program_id
      and program_enrollments.student_id = auth.uid()
      and program_enrollments.status = 'active'
  )
);

drop policy if exists "Admins manage program courses" on public.program_courses;
create policy "Admins manage program courses"
on public.program_courses for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Program enrollments visible to student and staff" on public.program_enrollments;
create policy "Program enrollments visible to student and staff"
on public.program_enrollments for select
using (student_id = auth.uid() or public.current_role() in ('admin', 'instructor'));

drop policy if exists "Admins manage program enrollments" on public.program_enrollments;
create policy "Admins manage program enrollments"
on public.program_enrollments for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Prerequisites are visible to authenticated users" on public.course_prerequisites;
create policy "Prerequisites are visible to authenticated users"
on public.course_prerequisites for select
using (auth.role() = 'authenticated');

drop policy if exists "Admins manage prerequisites" on public.course_prerequisites;
create policy "Admins manage prerequisites"
on public.course_prerequisites for all
using (public.is_admin())
with check (public.is_admin());
