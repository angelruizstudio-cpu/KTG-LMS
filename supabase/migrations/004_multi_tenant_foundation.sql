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

drop policy if exists "Tenant members can view their tenant" on public.tenants;
create policy "Tenant members can view their tenant"
on public.tenants for select
using (public.is_tenant_member(id));

drop policy if exists "Admins manage tenants" on public.tenants;
create policy "Admins manage tenants"
on public.tenants for update
using (public.is_admin() and id = public.current_tenant_id())
with check (public.is_admin() and id = public.current_tenant_id());

drop policy if exists "Tenant memberships visible inside tenant" on public.tenant_memberships;
create policy "Tenant memberships visible inside tenant"
on public.tenant_memberships for select
using (tenant_id = public.current_tenant_id());

drop policy if exists "Admins manage tenant memberships" on public.tenant_memberships;
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

drop policy if exists "Students and instructors update enrollments" on public.enrollments;
create policy "Tenant students and instructors update enrollments"
on public.enrollments for update
using (
  exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
      and (enrollments.student_id = auth.uid() or public.is_instructor_for_course(enrollments.course_id))
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
      and (enrollments.student_id = auth.uid() or public.is_instructor_for_course(enrollments.course_id))
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
