create table if not exists public.finance_clearances (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'hold' check (status in ('hold', 'cleared')),
  notes text,
  cleared_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table if not exists public.program_certificates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  certificate_number text not null unique,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles(id) on delete set null,
  unique (program_id, student_id)
);

drop trigger if exists finance_clearances_set_updated_at on public.finance_clearances;
create trigger finance_clearances_set_updated_at
before update on public.finance_clearances
for each row execute function public.set_updated_at();

alter table public.finance_clearances enable row level security;
alter table public.program_certificates enable row level security;

drop policy if exists "Finance clearance visible to student and staff" on public.finance_clearances;
create policy "Finance clearance visible to student and staff"
on public.finance_clearances for select
using (student_id = auth.uid() or public.current_role() in ('admin', 'instructor'));

drop policy if exists "Admins manage finance clearance" on public.finance_clearances;
create policy "Admins manage finance clearance"
on public.finance_clearances for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Program certificates visible to owners and staff" on public.program_certificates;
create policy "Program certificates visible to owners and staff"
on public.program_certificates for select
using (student_id = auth.uid() or public.current_role() in ('admin', 'instructor'));

drop policy if exists "Admins issue program certificates" on public.program_certificates;
create policy "Admins issue program certificates"
on public.program_certificates for insert
with check (public.is_admin());
