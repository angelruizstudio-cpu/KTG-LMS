-- 022_notifications.sql
-- In-app notification center: alongside the existing email notifications (Resend), users now get
-- an in-app record for the three events that most warrant a real-time nudge — a new grade, a course
-- announcement, and a reply to a discussion thread they started.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_idx on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- A notification is inserted by whichever server action triggered the event (grading, posting an
-- announcement, replying to a thread) on behalf of the recipient, not the recipient themselves —
-- the insert check only enforces tenant isolation; the calling action has already authorized the
-- underlying event (e.g. only the course owner can grade/announce).
create policy "Tenant members create notifications"
on public.notifications for insert
with check (tenant_id = public.current_tenant_id());

create policy "Recipients view their notifications"
on public.notifications for select
using (recipient_id = auth.uid());

create policy "Recipients mark their notifications read"
on public.notifications for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());
