-- Institution prospect pipeline for platform sales.

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
