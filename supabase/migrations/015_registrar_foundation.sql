-- 015_registrar_foundation.sql
-- Registrar epic, sub-épico A (foundation), continued from 014 (which added the enum value and
-- must already be committed before this file runs).
--
-- Adds:
--   - profiles.academic_status (a single, institution-wide status per student)
--   - is_registrar() helper
--   - Additive RLS policies granting the registrar role read access to student records,
--     enrollments, certificates, and gradebook, plus the ability to send course announcements.
--     These are NEW permissive policies (Postgres OR's multiple permissive SELECT policies
--     together) rather than edits to existing policies, so existing admin/instructor/student
--     access is untouched.
--   - Deliberately NO policy is added for finance_clearances: RLS defaults to deny, so a
--     registrar has zero access there unless explicitly granted later.

create type public.academic_status as enum ('active', 'inactive', 'withdrawn', 'graduated', 'suspended');

alter table public.profiles
  add column if not exists academic_status public.academic_status not null default 'active';

create or replace function public.is_registrar()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'registrar'
$$;

-- Student records: a registrar can view every profile in their tenant.
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

-- A registrar may update a student's contact info and academic status, but not their role
-- (role changes stay admin-only, enforced at the application layer in the server action).
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

-- Enrollment management: read/write within the registrar's tenant.
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

-- Academic records: read-only for course-level certificates/gradebook; program certificates are
-- readable too (transcript generation reads from here in a later sub-épico).
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

-- Communication: a registrar may post course announcements (records/enrollment notices), same
-- write shape as instructors, but without needing to be the course's instructor of record.
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
