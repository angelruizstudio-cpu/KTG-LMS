-- 010_secure_quiz_and_grades.sql
-- Hardening for security findings H1 (quiz answer exposure) and H2 (student self-grading).
--
-- H1: Any authenticated user could read quiz_questions.correct_answer directly through the
--     anon/authenticated PostgREST API, across every tenant. We remove column-level SELECT on
--     the answer column for client roles and scope row visibility to enrolled students / staff.
--     Server actions read correct_answer with the service role, which is never exposed to the client.
--
-- H2: Students could insert grades/attempts and mark their own enrollment "completed" directly
--     through the anon API. We remove the student self-write clauses; these rows are now written
--     only by server actions using the service role (which bypasses RLS).

--------------------------------------------------------------------------------
-- H1: quiz_questions column + row protection
--------------------------------------------------------------------------------

-- Column-level privileges: client roles may read everything EXCEPT correct_answer.
revoke select on public.quiz_questions from anon, authenticated;
grant select (id, quiz_id, prompt, choices, points, position) on public.quiz_questions to anon, authenticated;
grant all on public.quiz_questions to service_role;

-- Row-level: only the course instructor/admin or an enrolled student may see the questions at all.
drop policy if exists "Questions follow quiz access" on public.quiz_questions;
create policy "Questions visible to enrolled students and staff"
on public.quiz_questions for select
using (
  exists (
    select 1
    from public.quizzes
    join public.lessons on lessons.id = quizzes.lesson_id
    join public.course_modules on course_modules.id = lessons.module_id
    where quizzes.id = quiz_questions.quiz_id
      and (
        public.is_instructor_for_course(course_modules.course_id)
        or exists (
          select 1
          from public.enrollments
          where enrollments.course_id = course_modules.course_id
            and enrollments.student_id = auth.uid()
        )
      )
  )
);

--------------------------------------------------------------------------------
-- H2: students may not write grades, attempts, or completion state
--------------------------------------------------------------------------------

-- Gradebook: only course instructors/admins may write. Students keep read access via the
-- existing "Gradebook visible to students and course instructors" SELECT policy.
drop policy if exists "Course instructors manage gradebook" on public.gradebook_entries;
create policy "Course instructors manage gradebook"
on public.gradebook_entries for all
using (public.is_instructor_for_course(course_id))
with check (public.is_instructor_for_course(course_id));

-- Quiz attempts: students may read their own attempts, but never insert/update them from the
-- client. Attempts are recorded server-side with recomputed scores via the service role.
drop policy if exists "Students view and create their attempts" on public.quiz_attempts;
create policy "Students view their attempts"
on public.quiz_attempts for select
using (student_id = auth.uid() or public.is_admin());
create policy "Admins manage attempts"
on public.quiz_attempts for all
using (public.is_admin())
with check (public.is_admin());

-- Enrollments: students may no longer flip their own status/progress. Completion is written by
-- the server-side lesson-completion flow (service role); instructors/admins may still edit.
drop policy if exists "Tenant students and instructors update enrollments" on public.enrollments;
create policy "Tenant instructors update enrollments"
on public.enrollments for update
using (
  exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(enrollments.course_id)
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = enrollments.course_id
      and courses.tenant_id = public.current_tenant_id()
      and public.is_instructor_for_course(enrollments.course_id)
  )
);
