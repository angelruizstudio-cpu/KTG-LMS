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
