-- 020_discussions.sql
-- Course discussion boards: the largest gap identified against Canvas — students and instructors
-- had no way to ask/answer questions or discuss course material outside of announcements (which are
-- instructor-only, one-way). Threads live at the course level (shared across all sections, same as
-- lessons/modules) so students in different sections of the same course can still discuss together.

create table public.discussion_threads (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index discussion_threads_course_id_idx on public.discussion_threads(course_id);

create table public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index discussion_replies_thread_id_idx on public.discussion_replies(thread_id);

alter table public.discussion_threads enable row level security;
alter table public.discussion_replies enable row level security;

-- A course "member" is an enrolled student, the course's owning instructor, or an admin. Section
-- instructors are already covered by is_instructor_for_course() returning true for the course owner,
-- but a section instructor who isn't the owner should also be able to read/participate — checked via
-- is_section_instructor() against any of the course's sections they're assigned to.
create or replace function public.is_discussion_course_member(course_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where enrollments.course_id = course_uuid
      and enrollments.student_id = auth.uid()
  )
  or public.is_instructor_for_course(course_uuid)
  or exists (
    select 1 from public.course_sections
    where course_sections.course_id = course_uuid
      and public.is_section_instructor(course_sections.id)
  )
$$;

create policy "Course members view discussion threads"
on public.discussion_threads for select
using (public.is_discussion_course_member(course_id));

create policy "Course members start discussion threads"
on public.discussion_threads for insert
with check (public.is_discussion_course_member(course_id) and author_id = auth.uid());

create policy "Authors and instructors moderate discussion threads"
on public.discussion_threads for update
using (author_id = auth.uid() or public.is_instructor_for_course(course_id))
with check (author_id = auth.uid() or public.is_instructor_for_course(course_id));

create policy "Authors and instructors delete discussion threads"
on public.discussion_threads for delete
using (author_id = auth.uid() or public.is_instructor_for_course(course_id));

create policy "Course members view discussion replies"
on public.discussion_replies for select
using (
  exists (
    select 1 from public.discussion_threads
    where discussion_threads.id = discussion_replies.thread_id
      and public.is_discussion_course_member(discussion_threads.course_id)
  )
);

create policy "Course members post discussion replies"
on public.discussion_replies for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.discussion_threads
    where discussion_threads.id = discussion_replies.thread_id
      and public.is_discussion_course_member(discussion_threads.course_id)
  )
);

create policy "Authors and instructors delete discussion replies"
on public.discussion_replies for delete
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.discussion_threads
    where discussion_threads.id = discussion_replies.thread_id
      and public.is_instructor_for_course(discussion_threads.course_id)
  )
);
