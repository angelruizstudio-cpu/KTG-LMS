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
