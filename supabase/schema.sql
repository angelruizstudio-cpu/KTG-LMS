create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'instructor', 'student', 'registrar');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.lesson_type as enum ('video', 'pdf', 'text', 'assignment', 'quiz');
create type public.enrollment_status as enum ('active', 'completed', 'dropped');
create type public.academic_status as enum ('active', 'inactive', 'withdrawn', 'graduated', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'student',
  academic_status public.academic_status not null default 'active',
  avatar_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  cover_image_url text,
  status public.course_status not null default 'draft',
  price_cents integer not null default 0 check (price_cents >= 0),
  stripe_price_id text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.program_courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null default 1,
  required boolean not null default true,
  available_from timestamptz,
  unique (program_id, course_id)
);

create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table public.course_prerequisites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete cascade,
  unique (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  lesson_type public.lesson_type not null default 'text',
  video_url text,
  pdf_path text,
  content text,
  assignment_prompt text,
  due_at timestamptz,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  inactivity_alert_sent_at timestamptz,
  dropped_automatically boolean not null default false,
  unique (course_id, student_id)
);

create index enrollments_last_activity_at_idx on public.enrollments(last_activity_at) where status = 'active';

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (lesson_id, student_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  choices jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  points integer not null default 1 check (points > 0),
  position integer not null default 1
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer not null check (score between 0 and 100),
  passed boolean not null default false,
  submitted_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submission_text text not null,
  file_path text,
  status text not null default 'submitted' check (status in ('submitted', 'graded', 'returned')),
  grade_score numeric(6, 2),
  max_score numeric(6, 2) not null default 100,
  feedback text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (lesson_id, student_id)
);

create table public.gradebook_entries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_name text not null,
  score numeric(6, 2) not null,
  max_score numeric(6, 2) not null,
  feedback text,
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  certificate_number text not null unique,
  issued_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create table public.finance_clearances (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'hold' check (status in ('hold', 'cleared')),
  notes text,
  cleared_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table public.program_certificates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  certificate_number text not null unique,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles(id) on delete set null,
  unique (program_id, student_id)
);

create table public.course_announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index course_announcements_course_id_idx on public.course_announcements(course_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger finance_clearances_set_updated_at
before update on public.finance_clearances
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.is_instructor_for_course(course_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.courses
    where id = course_uuid
      and created_by = auth.uid()
  ) or public.is_admin()
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.programs enable row level security;
alter table public.program_courses enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.course_prerequisites enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.gradebook_entries enable row level security;
alter table public.certificates enable row level security;
alter table public.finance_clearances enable row level security;
alter table public.program_certificates enable row level security;
alter table public.course_announcements enable row level security;

create policy "Profiles are viewable by self, instructors, and admins"
on public.profiles for select
using (id = auth.uid() or public.current_role() in ('admin', 'instructor'));

create policy "Users can update their profile"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "Admins can insert profiles"
on public.profiles for insert
with check (public.is_admin());

create policy "Published courses are public to authenticated users"
on public.courses for select
using (status = 'published' or created_by = auth.uid() or public.is_admin());

create policy "Instructors can create courses"
on public.courses for insert
with check (created_by = auth.uid() and public.current_role() in ('admin', 'instructor'));

create policy "Instructors can update their courses"
on public.courses for update
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

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

create policy "Admins manage programs"
on public.programs for all
using (public.is_admin())
with check (public.is_admin());

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

create policy "Admins manage program courses"
on public.program_courses for all
using (public.is_admin())
with check (public.is_admin());

create policy "Program enrollments visible to student and staff"
on public.program_enrollments for select
using (student_id = auth.uid() or public.current_role() in ('admin', 'instructor'));

create policy "Admins manage program enrollments"
on public.program_enrollments for all
using (public.is_admin())
with check (public.is_admin());

create policy "Prerequisites are visible to authenticated users"
on public.course_prerequisites for select
using (auth.role() = 'authenticated');

create policy "Admins manage prerequisites"
on public.course_prerequisites for all
using (public.is_admin())
with check (public.is_admin());

create policy "Course modules follow course access"
on public.course_modules for select
using (
  exists (
    select 1 from public.courses
    where courses.id = course_modules.course_id
      and (courses.status = 'published' or courses.created_by = auth.uid() or public.is_admin())
  )
);

create policy "Instructors manage course modules"
on public.course_modules for all
using (public.is_instructor_for_course(course_id))
with check (public.is_instructor_for_course(course_id));

create policy "Lessons follow module course access"
on public.lessons for select
using (
  exists (
    select 1
    from public.course_modules
    join public.courses on courses.id = course_modules.course_id
    where course_modules.id = lessons.module_id
      and (courses.status = 'published' or courses.created_by = auth.uid() or public.is_admin())
  )
);

create policy "Instructors manage lessons"
on public.lessons for all
using (
  exists (
    select 1 from public.course_modules
    where course_modules.id = lessons.module_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
)
with check (
  exists (
    select 1 from public.course_modules
    where course_modules.id = lessons.module_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
);

create policy "Students view their enrollments"
on public.enrollments for select
using (student_id = auth.uid() or public.is_instructor_for_course(course_id));

create policy "Students enroll themselves"
on public.enrollments for insert
with check (student_id = auth.uid() or public.is_admin());

create policy "Students and instructors update enrollments"
on public.enrollments for update
using (student_id = auth.uid() or public.is_instructor_for_course(course_id))
with check (student_id = auth.uid() or public.is_instructor_for_course(course_id));

create policy "Students view their progress"
on public.lesson_progress for select
using (student_id = auth.uid() or public.is_admin());

create policy "Students manage their progress"
on public.lesson_progress for all
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "Quizzes follow lesson access"
on public.quizzes for select
using (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    join public.courses on courses.id = course_modules.course_id
    where lessons.id = quizzes.lesson_id
      and (courses.status = 'published' or courses.created_by = auth.uid() or public.is_admin())
  )
);

create policy "Instructors manage quizzes"
on public.quizzes for all
using (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = quizzes.lesson_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
)
with check (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = quizzes.lesson_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
);

-- correct_answer must never be readable by client roles (see migration 010).
revoke select on public.quiz_questions from anon, authenticated;
grant select (id, quiz_id, prompt, choices, points, position) on public.quiz_questions to anon, authenticated;
grant all on public.quiz_questions to service_role;

create policy "Questions visible to enrolled students and staff"
on public.quiz_questions for select
using (
  exists (
    select 1
    from public.quizzes
    join public.lessons on lessons.id = quizzes.lesson_id
    join public.course_modules on course_modules.id = lessons.module_id
    where quizzes.id = quiz_questions.quiz_id
      and (
        public.is_instructor_for_course(course_modules.course_id)
        or exists (
          select 1
          from public.enrollments
          where enrollments.course_id = course_modules.course_id
            and enrollments.student_id = auth.uid()
        )
      )
  )
);

create policy "Instructors manage questions"
on public.quiz_questions for all
using (
  exists (
    select 1
    from public.quizzes
    join public.lessons on lessons.id = quizzes.lesson_id
    join public.course_modules on course_modules.id = lessons.module_id
    where quizzes.id = quiz_questions.quiz_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
)
with check (
  exists (
    select 1
    from public.quizzes
    join public.lessons on lessons.id = quizzes.lesson_id
    join public.course_modules on course_modules.id = lessons.module_id
    where quizzes.id = quiz_questions.quiz_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
);

-- Students may read their own attempts, but attempts are recorded server-side (service role)
-- with recomputed scores; direct client writes are not allowed (see migration 010).
create policy "Students view their attempts"
on public.quiz_attempts for select
using (student_id = auth.uid() or public.is_admin());

create policy "Admins manage attempts"
on public.quiz_attempts for all
using (public.is_admin())
with check (public.is_admin());

create policy "Assignment submissions visible to students and instructors"
on public.assignment_submissions for select
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = assignment_submissions.lesson_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
);

create policy "Students submit assignments"
on public.assignment_submissions for insert
with check (student_id = auth.uid());

create policy "Students can update their own submitted assignments"
on public.assignment_submissions for update
using (student_id = auth.uid() or public.is_admin())
with check (student_id = auth.uid() or public.is_admin());

create policy "Instructors grade assignments"
on public.assignment_submissions for update
using (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = assignment_submissions.lesson_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
)
with check (
  exists (
    select 1
    from public.lessons
    join public.course_modules on course_modules.id = lessons.module_id
    where lessons.id = assignment_submissions.lesson_id
      and public.is_instructor_for_course(course_modules.course_id)
  )
);

create policy "Gradebook visible to students and course instructors"
on public.gradebook_entries for select
using (student_id = auth.uid() or public.is_instructor_for_course(course_id));

-- Only instructors/admins may write grades. Students read via the SELECT policy above;
-- quiz gradebook rows are written server-side via the service role (see migration 010).
create policy "Course instructors manage gradebook"
on public.gradebook_entries for all
using (public.is_instructor_for_course(course_id))
with check (public.is_instructor_for_course(course_id));

create policy "Certificates visible to owners and instructors"
on public.certificates for select
using (student_id = auth.uid() or public.is_instructor_for_course(course_id));

create policy "Certificates generated by completion flow"
on public.certificates for insert
with check (student_id = auth.uid() or public.is_admin());

create policy "Finance clearance visible to student and staff"
on public.finance_clearances for select
using (student_id = auth.uid() or public.current_role() in ('admin', 'instructor'));

create policy "Admins manage finance clearance"
on public.finance_clearances for all
using (public.is_admin())
with check (public.is_admin());

create policy "Program certificates visible to owners and staff"
on public.program_certificates for select
using (student_id = auth.uid() or public.current_role() in ('admin', 'instructor'));

create policy "Admins issue program certificates"
on public.program_certificates for insert
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('lesson-files', 'lesson-files', false)
on conflict (id) do nothing;

create policy "Authenticated users can read lesson files"
on storage.objects for select
using (bucket_id = 'lesson-files' and auth.role() = 'authenticated');

create policy "Instructors can upload lesson files"
on storage.objects for insert
with check (bucket_id = 'lesson-files' and public.current_role() in ('admin', 'instructor'));

create policy "Instructors can update lesson files"
on storage.objects for update
using (bucket_id = 'lesson-files' and public.current_role() in ('admin', 'instructor'))
with check (bucket_id = 'lesson-files' and public.current_role() in ('admin', 'instructor'));

-- Multi-tenant foundation. The app starts with one tenant and keeps all
-- academic records scoped by the user's current tenant.
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

insert into public.tenants (name, slug)
values ('Dosis Educa', 'dosis-educa')
on conflict (slug) do nothing;

alter table public.profiles
add column if not exists default_tenant_id uuid references public.tenants(id) on delete restrict;

alter table public.courses
add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

alter table public.programs
add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

update public.profiles
set default_tenant_id = (select id from public.tenants where slug = 'dosis-educa')
where default_tenant_id is null;

update public.courses
set tenant_id = coalesce(
  (select profiles.default_tenant_id from public.profiles where profiles.id = courses.created_by),
  (select id from public.tenants where slug = 'dosis-educa')
)
where tenant_id is null;

update public.programs
set tenant_id = (select id from public.tenants where slug = 'dosis-educa')
where tenant_id is null;

alter table public.profiles
alter column default_tenant_id set not null;

alter table public.courses
alter column tenant_id set not null;

alter table public.programs
alter column tenant_id set not null;

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null default 'student',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

insert into public.tenant_memberships (tenant_id, user_id, role)
select default_tenant_id, id, role
from public.profiles
on conflict (tenant_id, user_id) do update
set role = excluded.role,
    status = 'active';

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select default_tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant_uuid uuid;
  user_role public.user_role;
begin
  tenant_uuid := coalesce(
    nullif(new.raw_user_meta_data->>'tenant_id', '')::uuid,
    (select id from public.tenants where slug = 'dosis-educa' limit 1)
  );
  user_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student');

  insert into public.profiles (id, email, full_name, role, default_tenant_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    user_role,
    tenant_uuid
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      default_tenant_id = excluded.default_tenant_id;

  insert into public.tenant_memberships (tenant_id, user_id, role)
  values (tenant_uuid, new.id, user_role)
  on conflict (tenant_id, user_id) do update
  set role = excluded.role,
      status = 'active';

  return new;
end;
$$;

create or replace function public.is_tenant_member(tenant_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships
    where tenant_id = tenant_uuid
      and user_id = auth.uid()
      and status = 'active'
  )
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.tenant_memberships
  where user_id = auth.uid()
    and tenant_id = public.current_tenant_id()
    and status = 'active'
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.is_registrar()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'registrar'
$$;

create or replace function public.is_instructor_for_course(course_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses
    where id = course_uuid
      and tenant_id = public.current_tenant_id()
      and (created_by = auth.uid() or public.is_admin())
  )
$$;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;

create policy "Tenant members can view their tenant"
on public.tenants for select
using (public.is_tenant_member(id));

create policy "Admins manage tenants"
on public.tenants for update
using (public.is_admin() and id = public.current_tenant_id())
with check (public.is_admin() and id = public.current_tenant_id());

create policy "Tenant memberships visible inside tenant"
on public.tenant_memberships for select
using (tenant_id = public.current_tenant_id());

create policy "Admins manage tenant memberships"
on public.tenant_memberships for all
using (public.is_admin() and tenant_id = public.current_tenant_id())
with check (public.is_admin() and tenant_id = public.current_tenant_id());

drop policy if exists "Profiles are viewable by self, instructors, and admins" on public.profiles;
create policy "Profiles are viewable inside tenant"
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.tenant_memberships viewer
    join public.tenant_memberships target
      on target.tenant_id = viewer.tenant_id
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and target.user_id = profiles.id
      and target.status = 'active'
      and viewer.role in ('admin', 'instructor')
  )
);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (id = auth.uid() or (public.is_admin() and default_tenant_id = public.current_tenant_id()))
with check (id = auth.uid() or (public.is_admin() and default_tenant_id = public.current_tenant_id()));

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles for insert
with check (public.is_admin() and default_tenant_id = public.current_tenant_id());

drop policy if exists "Published courses are public to authenticated users" on public.courses;
create policy "Tenant courses are visible to tenant users"
on public.courses for select
using (
  tenant_id = public.current_tenant_id()
  and (status = 'published' or created_by = auth.uid() or public.current_role() in ('admin', 'instructor'))
);

drop policy if exists "Instructors can create courses" on public.courses;
create policy "Tenant instructors can create courses"
on public.courses for insert
with check (
  tenant_id = public.current_tenant_id()
  and created_by = auth.uid()
  and public.current_role() in ('admin', 'instructor')
);

drop policy if exists "Instructors can update their courses" on public.courses;
create policy "Tenant instructors can update their courses"
on public.courses for update
using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()))
with check (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

drop policy if exists "Programs are visible to admins, instructors, and assigned students" on public.programs;
create policy "Tenant programs are visible to tenant users"
on public.programs for select
using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_role() in ('admin', 'instructor')
    or exists (
      select 1 from public.program_enrollments
      where program_enrollments.program_id = programs.id
        and program_enrollments.student_id = auth.uid()
        and program_enrollments.status = 'active'
    )
  )
);

drop policy if exists "Admins manage programs" on public.programs;
create policy "Tenant admins manage programs"
on public.programs for all
using (tenant_id = public.current_tenant_id() and public.is_admin())
with check (tenant_id = public.current_tenant_id() and public.is_admin());

drop policy if exists "Program courses are visible to assigned students and staff" on public.program_courses;
create policy "Tenant program courses are visible to assigned students and staff"
on public.program_courses for select
using (
  exists (
    select 1
    from public.programs
    where programs.id = program_courses.program_id
      and programs.tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('admin', 'instructor')
        or exists (
          select 1
          from public.program_enrollments
          where program_enrollments.program_id = programs.id
            and program_enrollments.student_id = auth.uid()
            and program_enrollments.status = 'active'
        )
      )
  )
);

drop policy if exists "Admins manage program courses" on public.program_courses;
create policy "Tenant admins manage program courses"
on public.program_courses for all
using (
  public.is_admin()
  and exists (
    select 1
    from public.programs
    where programs.id = program_courses.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.programs
    where programs.id = program_courses.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
);

drop policy if exists "Program enrollments visible to student and staff" on public.program_enrollments;
create policy "Tenant program enrollments visible to student and staff"
on public.program_enrollments for select
using (
  exists (
    select 1
    from public.programs
    where programs.id = program_enrollments.program_id
      and programs.tenant_id = public.current_tenant_id()
      and (program_enrollments.student_id = auth.uid() or public.current_role() in ('admin', 'instructor'))
  )
);

drop policy if exists "Admins manage program enrollments" on public.program_enrollments;
create policy "Tenant admins manage program enrollments"
on public.program_enrollments for all
using (
  public.is_admin()
  and exists (
    select 1
    from public.programs
    where programs.id = program_enrollments.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.programs
    where programs.id = program_enrollments.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
);

drop policy if exists "Prerequisites are visible to authenticated users" on public.course_prerequisites;
create policy "Tenant prerequisites are visible to tenant users"
on public.course_prerequisites for select
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_prerequisites.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);

drop policy if exists "Admins manage prerequisites" on public.course_prerequisites;
create policy "Tenant admins manage prerequisites"
on public.course_prerequisites for all
using (
  public.is_admin()
  and exists (
    select 1
    from public.courses
    where courses.id = course_prerequisites.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.courses
    where courses.id = course_prerequisites.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);

drop policy if exists "Course modules follow course access" on public.course_modules;
create policy "Tenant course modules follow course access"
on public.course_modules for select
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_modules.course_id
      and courses.tenant_id = public.current_tenant_id()
      and (courses.status = 'published' or courses.created_by = auth.uid() or public.current_role() in ('admin', 'instructor'))
  )
);

drop policy if exists "Lessons follow module course access" on public.lessons;
create policy "Tenant lessons follow module course access"
on public.lessons for select
using (
  exists (
    select 1
    from public.course_modules
    join public.courses on courses.id = course_modules.course_id
    where course_modules.id = lessons.module_id
      and courses.tenant_id = public.current_tenant_id()
      and (courses.status = 'published' or courses.created_by = auth.uid() or public.current_role() in ('admin', 'instructor'))
  )
);

-- Visible to the course's instructor/admin, or a student enrolled in that course.
create policy "Tenant announcements visible to course members"
on public.course_announcements for select
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
      and (
        public.is_instructor_for_course(course_announcements.course_id)
        or public.is_admin()
        or exists (
          select 1
          from public.enrollments
          where enrollments.course_id = course_announcements.course_id
            and enrollments.student_id = auth.uid()
        )
      )
  )
);

-- Only the course's instructor/admin may write announcements.
create policy "Tenant instructors manage announcements"
on public.course_announcements for all
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(course_announcements.course_id)
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(course_announcements.course_id)
  )
);

drop policy if exists "Students view their enrollments" on public.enrollments;
create policy "Tenant students view their enrollments"
on public.enrollments for select
using (
  exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
      and (enrollments.student_id = auth.uid() or public.is_instructor_for_course(enrollments.course_id))
  )
);

drop policy if exists "Students enroll themselves" on public.enrollments;
create policy "Tenant admins enroll students"
on public.enrollments for insert
with check (
  public.is_admin()
  and exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);

-- Students may not flip their own progress/status; completion is written server-side via the
-- service role (see migration 010). Instructors/admins may still edit enrollments.
drop policy if exists "Students and instructors update enrollments" on public.enrollments;
drop policy if exists "Tenant students and instructors update enrollments" on public.enrollments;
create policy "Tenant instructors update enrollments"
on public.enrollments for update
using (
  exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(enrollments.course_id)
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(enrollments.course_id)
  )
);

drop policy if exists "Finance clearance visible to student and staff" on public.finance_clearances;
create policy "Tenant finance clearance visible to student and staff"
on public.finance_clearances for select
using (
  exists (
    select 1
    from public.programs
    where programs.id = finance_clearances.program_id
      and programs.tenant_id = public.current_tenant_id()
      and (finance_clearances.student_id = auth.uid() or public.current_role() in ('admin', 'instructor'))
  )
);

drop policy if exists "Admins manage finance clearance" on public.finance_clearances;
create policy "Tenant admins manage finance clearance"
on public.finance_clearances for all
using (
  public.is_admin()
  and exists (
    select 1
    from public.programs
    where programs.id = finance_clearances.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.programs
    where programs.id = finance_clearances.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
);

drop policy if exists "Program certificates visible to owners and staff" on public.program_certificates;
create policy "Tenant program certificates visible to owners and staff"
on public.program_certificates for select
using (
  exists (
    select 1
    from public.programs
    where programs.id = program_certificates.program_id
      and programs.tenant_id = public.current_tenant_id()
      and (program_certificates.student_id = auth.uid() or public.current_role() in ('admin', 'instructor'))
  )
);

drop policy if exists "Admins issue program certificates" on public.program_certificates;
create policy "Tenant admins issue program certificates"
on public.program_certificates for insert
with check (
  public.is_admin()
  and exists (
    select 1
    from public.programs
    where programs.id = program_certificates.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
);

-- Tenant switcher policies. Users can see their memberships across tenants,
-- and can only switch their active tenant to an organization they belong to.
drop policy if exists "Tenant memberships visible inside tenant" on public.tenant_memberships;
drop policy if exists "Tenant memberships visible to owner and tenant staff" on public.tenant_memberships;
create policy "Tenant memberships visible to owner and tenant staff"
on public.tenant_memberships for select
using (
  user_id = auth.uid()
  or tenant_id = public.current_tenant_id()
);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (
  id = auth.uid()
  or (public.is_admin() and default_tenant_id = public.current_tenant_id())
)
with check (
  (
    id = auth.uid()
    and public.is_tenant_member(default_tenant_id)
  )
  or (
    public.is_admin()
    and default_tenant_id = public.current_tenant_id()
  )
);

-- Institution login identities and platform-level LMS administration.
alter table public.tenants
add column if not exists code text;

update public.tenants
set code = upper(left(regexp_replace(slug, '[^a-zA-Z0-9]', '', 'g'), 8))
where code is null;

alter table public.tenants
alter column code set not null;

create unique index if not exists tenants_code_key on public.tenants (code);

create table if not exists public.tenant_user_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_user_id text not null,
  role public.user_role not null default 'student',
  status text not null default 'active' check (status in ('active', 'inactive')),
  issued_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (institution_user_id)
);

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

with ranked_memberships as (
  select
    memberships.tenant_id,
    memberships.user_id,
    memberships.role,
    tenants.code,
    row_number() over (partition by memberships.tenant_id order by memberships.created_at, memberships.id) as sequence_number
  from public.tenant_memberships memberships
  join public.tenants on tenants.id = memberships.tenant_id
)
insert into public.tenant_user_identities (tenant_id, user_id, institution_user_id, role, status)
select
  tenant_id,
  user_id,
  code || '-' || lpad(sequence_number::text, 6, '0'),
  role,
  'active'
from ranked_memberships
on conflict (tenant_id, user_id) do update
set role = excluded.role,
    status = 'active';

create or replace function public.next_institution_user_id(tenant_uuid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant_code text;
  next_number integer;
begin
  select code into tenant_code
  from public.tenants
  where id = tenant_uuid;

  if tenant_code is null then
    raise exception 'Tenant code not found';
  end if;

  select coalesce(max((regexp_match(institution_user_id, '([0-9]+)$'))[1]::integer), 0) + 1
  into next_number
  from public.tenant_user_identities
  where tenant_id = tenant_uuid;

  return tenant_code || '-' || lpad(next_number::text, 6, '0');
end;
$$;

alter table public.tenant_user_identities enable row level security;
alter table public.platform_admins enable row level security;

drop policy if exists "Tenant identities visible to owner and tenant staff" on public.tenant_user_identities;
create policy "Tenant identities visible to owner and tenant staff"
on public.tenant_user_identities for select
using (
  user_id = auth.uid()
  or (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('admin', 'instructor')
  )
);

drop policy if exists "Tenant admins manage identities" on public.tenant_user_identities;
create policy "Tenant admins manage identities"
on public.tenant_user_identities for all
using (tenant_id = public.current_tenant_id() and public.is_admin())
with check (tenant_id = public.current_tenant_id() and public.is_admin());

drop policy if exists "Platform admins see their own platform access" on public.platform_admins;
create policy "Platform admins see their own platform access"
on public.platform_admins for select
using (user_id = auth.uid() and status = 'active');

-- Platform prospect pipeline for institutions interested in subscribing.
create table if not exists public.institution_prospects (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null,
  institution_type text not null default 'other' check (
    institution_type in ('church', 'bible_institute', 'seminary', 'school', 'ministry', 'nonprofit', 'other')
  ),
  website text,
  country text,
  city text,
  contact_name text not null,
  contact_role text,
  email text not null,
  phone text,
  estimated_students integer check (estimated_students is null or estimated_students >= 0),
  estimated_instructors integer check (estimated_instructors is null or estimated_instructors >= 0),
  programs_needed text,
  pain_points text,
  budget_range text,
  source text not null default 'manual',
  status text not null default 'new' check (
    status in ('new', 'contacted', 'demo_scheduled', 'demo_completed', 'proposal_sent', 'negotiation', 'won', 'lost')
  ),
  ai_score integer not null default 0 check (ai_score between 0 and 100),
  ai_priority text not null default 'low' check (ai_priority in ('low', 'medium', 'high')),
  ai_summary text,
  ai_next_action text,
  ai_email_draft text,
  next_follow_up_at timestamptz,
  converted_tenant_id uuid references public.tenants(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_prospect_interactions (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.institution_prospects(id) on delete cascade,
  interaction_type text not null default 'note' check (
    interaction_type in ('note', 'call', 'email', 'meeting', 'demo', 'proposal', 'task')
  ),
  content text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.institution_prospect_tasks (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.institution_prospects(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists institution_prospects_set_updated_at on public.institution_prospects;
create trigger institution_prospects_set_updated_at
before update on public.institution_prospects
for each row execute function public.set_updated_at();

alter table public.institution_prospects enable row level security;
alter table public.institution_prospect_interactions enable row level security;
alter table public.institution_prospect_tasks enable row level security;

drop policy if exists "Platform admins manage institution prospects" on public.institution_prospects;
create policy "Platform admins manage institution prospects"
on public.institution_prospects for all
using (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
);

drop policy if exists "Platform admins manage prospect interactions" on public.institution_prospect_interactions;
create policy "Platform admins manage prospect interactions"
on public.institution_prospect_interactions for all
using (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
);

drop policy if exists "Platform admins manage prospect tasks" on public.institution_prospect_tasks;
create policy "Platform admins manage prospect tasks"
on public.institution_prospect_tasks for all
using (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
);

-- Platform AI knowledge base used to guide prospect analysis.
create table if not exists public.ai_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  category text not null default 'general' check (
    category in ('general', 'features', 'pricing', 'qualification', 'objections', 'email', 'policy')
  ),
  content text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ai_knowledge_sources_set_updated_at on public.ai_knowledge_sources;
create trigger ai_knowledge_sources_set_updated_at
before update on public.ai_knowledge_sources
for each row execute function public.set_updated_at();

alter table public.ai_knowledge_sources enable row level security;

drop policy if exists "Platform admins manage AI knowledge sources" on public.ai_knowledge_sources;
create policy "Platform admins manage AI knowledge sources"
on public.ai_knowledge_sources for all
using (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
);

insert into public.ai_knowledge_sources (title, category, content)
values
  (
    'Ideal institution profile',
    'qualification',
    'Prioritize seminaries, Bible institutes, ministry schools, churches, and nonprofit training organizations that need program-based access, assigned courses, certificates, finance clearance, instructor dashboards, and student progress tracking.'
  ),
  (
    'Dosis Educa LMS value proposition',
    'features',
    'Dosis Educa LMS is a multi-tenant learning platform where each institution receives its own admin portal. Students log in with an institution-issued ID. Administrators assign program access and course availability based on enrollment, prerequisites, and academic/finance rules.'
  ),
  (
    'Commercial qualification rules',
    'qualification',
    'High-priority prospects usually have a clear program need, more than 40 active students, multiple instructors, certificate requirements, a near-term launch date, or current manual processes they want to replace.'
  ),
  (
    'Follow-up tone',
    'email',
    'Use a warm, professional, faith-friendly tone. Ask for a discovery call, confirm the programs they want to manage, and emphasize assigned learning paths, certificates, finance clearance, and institution-specific administration.'
  )
on conflict (title) do nothing;

-- Public AI chat conversations for institution visitors.
create table if not exists public.ai_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_label text,
  source_page text not null default 'public_site',
  status text not null default 'open' check (status in ('open', 'qualified', 'converted', 'closed')),
  prospect_id uuid references public.institution_prospects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

drop trigger if exists ai_chat_conversations_set_updated_at on public.ai_chat_conversations;
create trigger ai_chat_conversations_set_updated_at
before update on public.ai_chat_conversations
for each row execute function public.set_updated_at();

alter table public.ai_chat_conversations enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists "Platform admins manage AI chat conversations" on public.ai_chat_conversations;
create policy "Platform admins manage AI chat conversations"
on public.ai_chat_conversations for all
using (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
);

drop policy if exists "Platform admins manage AI chat messages" on public.ai_chat_messages;
create policy "Platform admins manage AI chat messages"
on public.ai_chat_messages for all
using (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.platform_admins
    where platform_admins.user_id = auth.uid()
      and platform_admins.status = 'active'
  )
);

-- Registrar role (see supabase/migrations/015_registrar_foundation.sql for the rationale).
-- Additive policies: they grant the registrar role access without touching existing
-- admin/instructor/student policies. Deliberately no policy is added for finance_clearances.

create policy "Tenant registrars view profiles"
on public.profiles for select
using (
  public.is_registrar()
  and exists (
    select 1
    from public.tenant_memberships
    where tenant_memberships.user_id = profiles.id
      and tenant_memberships.tenant_id = public.current_tenant_id()
      and tenant_memberships.status = 'active'
  )
);

create policy "Tenant registrars update student profiles"
on public.profiles for update
using (
  public.is_registrar()
  and role = 'student'
  and exists (
    select 1
    from public.tenant_memberships
    where tenant_memberships.user_id = profiles.id
      and tenant_memberships.tenant_id = public.current_tenant_id()
      and tenant_memberships.status = 'active'
  )
)
with check (role = 'student');

create policy "Tenant registrars manage enrollments"
on public.enrollments for all
using (
  public.is_registrar()
  and exists (
    select 1 from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_registrar()
  and exists (
    select 1 from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);

create policy "Tenant registrars manage program enrollments"
on public.program_enrollments for all
using (
  public.is_registrar()
  and exists (
    select 1 from public.programs
    where programs.id = program_enrollments.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_registrar()
  and exists (
    select 1 from public.programs
    where programs.id = program_enrollments.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
);

create policy "Tenant registrars view certificates"
on public.certificates for select
using (
  public.is_registrar()
  and exists (
    select 1 from public.courses
    where courses.id = certificates.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);

create policy "Tenant registrars view program certificates"
on public.program_certificates for select
using (
  public.is_registrar()
  and exists (
    select 1 from public.programs
    where programs.id = program_certificates.program_id
      and programs.tenant_id = public.current_tenant_id()
  )
);

create policy "Tenant registrars view gradebook"
on public.gradebook_entries for select
using (
  public.is_registrar()
  and exists (
    select 1 from public.courses
    where courses.id = gradebook_entries.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);

create policy "Tenant registrars manage announcements"
on public.course_announcements for all
using (
  public.is_registrar()
  and exists (
    select 1 from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_registrar()
  and exists (
    select 1 from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
  )
);
