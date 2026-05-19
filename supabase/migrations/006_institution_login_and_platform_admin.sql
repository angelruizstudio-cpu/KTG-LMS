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
