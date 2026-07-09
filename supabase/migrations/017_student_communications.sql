-- 017_student_communications.sql
-- Registrar epic, sub-épico G (communication): a log of academic/registration messages sent to a
-- student by staff, plus the email delivery status of each. This is the minimal messaging piece —
-- not a full inbox — students receive these as email; the table exists so staff can see a history
-- of what was communicated and when.

create table public.student_communications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  sent_by uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  body text not null,
  delivered boolean not null default false,
  sent_at timestamptz not null default now()
);

create index student_communications_student_id_idx on public.student_communications(student_id);

alter table public.student_communications enable row level security;

-- Visible to the registrar/admin who can already manage this student's record (tenant-scoped, same
-- shape as the "Tenant registrars view profiles" policy from migration 015).
create policy "Tenant staff view student communications"
on public.student_communications for select
using (
  (public.is_registrar() or public.is_admin())
  and exists (
    select 1
    from public.tenant_memberships
    where tenant_memberships.user_id = student_communications.student_id
      and tenant_memberships.tenant_id = public.current_tenant_id()
      and tenant_memberships.status = 'active'
  )
);

create policy "Tenant staff send student communications"
on public.student_communications for insert
with check (
  (public.is_registrar() or public.is_admin())
  and sent_by = auth.uid()
  and exists (
    select 1
    from public.tenant_memberships
    where tenant_memberships.user_id = student_communications.student_id
      and tenant_memberships.tenant_id = public.current_tenant_id()
      and tenant_memberships.status = 'active'
  )
);
