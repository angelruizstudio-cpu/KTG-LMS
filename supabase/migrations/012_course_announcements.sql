-- 012_course_announcements.sql
-- Roadmap Phase 1, item 3: there was no communication layer at all — no announcements,
-- discussions, inbox, or notifications. This adds the minimal piece: per-course announcements
-- that instructors post and enrolled students read, closing the most common day-to-day
-- communication gap without building the full messaging/notification stack.

create table public.course_announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index course_announcements_course_id_idx on public.course_announcements(course_id);

alter table public.course_announcements enable row level security;

-- Visible to the course's instructor/admin, or a student enrolled in that course, scoped to the
-- caller's tenant (mirrors the pattern used for lessons/enrollments elsewhere in this schema).
create policy "Tenant announcements visible to course members"
on public.course_announcements for select
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
      and (
        public.is_instructor_for_course(course_announcements.course_id)
        or public.is_admin()
        or exists (
          select 1
          from public.enrollments
          where enrollments.course_id = course_announcements.course_id
            and enrollments.student_id = auth.uid()
        )
      )
  )
);

-- Only the course's instructor/admin may write announcements.
create policy "Tenant instructors manage announcements"
on public.course_announcements for all
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(course_announcements.course_id)
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = course_announcements.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(course_announcements.course_id)
  )
);
