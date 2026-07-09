-- 018_academic_terms.sql
-- Roadmap Phase A (academic structure): introduces academic terms (semesters/terms) as an
-- organizational layer above courses. Every course must belong to a term going forward — existing
-- courses are backfilled into an auto-created "General" term per tenant so nothing breaks, then the
-- column is made NOT NULL.
--
-- Programs are intentionally NOT tied to a term: a program is a multi-course credential that
-- typically spans several terms, so term membership belongs to the course, not the program.

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  unique (tenant_id, name),
  check (start_date is null or end_date is null or end_date >= start_date)
);

alter table public.courses add column if not exists academic_term_id uuid references public.academic_terms(id) on delete restrict;

-- Backfill: one "General" term per tenant that already has courses, with no fixed dates (an
-- open-ended term for content created before this feature existed).
insert into public.academic_terms (tenant_id, name, start_date, end_date)
select distinct tenant_id, 'General', null::date, null::date
from public.courses
where tenant_id is not null
on conflict (tenant_id, name) do nothing;

update public.courses
set academic_term_id = academic_terms.id
from public.academic_terms
where courses.academic_term_id is null
  and courses.tenant_id = academic_terms.tenant_id
  and academic_terms.name = 'General';

alter table public.courses alter column academic_term_id set not null;

create index courses_academic_term_id_idx on public.courses(academic_term_id);

alter table public.academic_terms enable row level security;

-- Any active tenant member may view terms (needed to pick one when creating a course).
create policy "Tenant members view academic terms"
on public.academic_terms for select
using (
  exists (
    select 1
    from public.tenant_memberships
    where tenant_memberships.user_id = auth.uid()
      and tenant_memberships.tenant_id = academic_terms.tenant_id
      and tenant_memberships.status = 'active'
  )
);

-- Only admins define the institutional calendar.
create policy "Tenant admins manage academic terms"
on public.academic_terms for all
using (public.is_admin() and tenant_id = public.current_tenant_id())
with check (public.is_admin() and tenant_id = public.current_tenant_id());
