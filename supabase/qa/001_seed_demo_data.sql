-- Dosis Educa LMS QA/demo dataset.
-- Run this in Supabase SQL Editor after creating the Auth users listed in supabase/qa/README.md.
-- Edit the emails below if you use real QA inboxes.

begin;

create temp table qa_user_accounts (
  account_key text primary key,
  email text not null unique,
  full_name text not null,
  app_role public.user_role not null,
  institution_user_id text
) on commit drop;

insert into qa_user_accounts (account_key, email, full_name, app_role, institution_user_id)
values
  ('platform_admin', 'platform.admin@dosisdemo.test', 'Patricia Platform QA', 'admin', null),
  ('institution_admin', 'institution.admin@dosisdemo.test', 'Andrea Admin QA', 'admin', 'DEMO-ADMIN-001'),
  ('instructor', 'instructor@dosisdemo.test', 'Isabel Instructor QA', 'instructor', 'DEMO-INST-001'),
  ('student_active', 'student.active@dosisdemo.test', 'Samuel Student Active QA', 'student', 'DEMO-STUD-001'),
  ('student_complete', 'student.complete@dosisdemo.test', 'Carla Student Complete QA', 'student', 'DEMO-STUD-002');

do $$
declare
  missing_accounts text;
begin
  select string_agg(accounts.email, ', ' order by accounts.email)
  into missing_accounts
  from qa_user_accounts accounts
  left join auth.users users on lower(users.email) = lower(accounts.email)
  where users.id is null;

  if missing_accounts is not null then
    raise exception 'Create these Supabase Auth users before running this seed: %', missing_accounts;
  end if;
end $$;

create temp table qa_users on commit drop as
select
  accounts.account_key,
  users.id,
  accounts.email,
  accounts.full_name,
  accounts.app_role,
  accounts.institution_user_id
from qa_user_accounts accounts
join auth.users users on lower(users.email) = lower(accounts.email);

insert into public.tenants (name, slug, code, status)
values ('Dosis Educa', 'dosis-educa', 'DOSIS', 'active')
on conflict (slug) do update
set name = excluded.name,
    status = 'active',
    code = coalesce(public.tenants.code, excluded.code);

create temp table qa_tenant on commit drop as
select id
from public.tenants
where slug = 'dosis-educa';

insert into public.profiles (id, email, full_name, role, default_tenant_id)
select users.id, users.email, users.full_name, users.app_role, tenant.id
from qa_users users
cross join qa_tenant tenant
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    default_tenant_id = excluded.default_tenant_id;

insert into public.tenant_memberships (tenant_id, user_id, role, status)
select tenant.id, users.id, users.app_role, 'active'
from qa_users users
cross join qa_tenant tenant
where users.account_key <> 'platform_admin'
on conflict (tenant_id, user_id) do update
set role = excluded.role,
    status = 'active';

insert into public.tenant_user_identities (tenant_id, user_id, institution_user_id, role, status)
select tenant.id, users.id, users.institution_user_id, users.app_role, 'active'
from qa_users users
cross join qa_tenant tenant
where users.institution_user_id is not null
on conflict (tenant_id, user_id) do update
set institution_user_id = excluded.institution_user_id,
    role = excluded.role,
    status = 'active';

insert into public.platform_admins (user_id, status)
select id, 'active'
from qa_users
where account_key = 'platform_admin'
on conflict (user_id) do update
set status = 'active';

delete from public.programs
where slug in ('qa-certificate-ministry');

delete from public.courses
where slug in ('qa-biblical-foundations', 'qa-ministry-leadership');

create temp table qa_courses (
  slug text primary key,
  id uuid not null
) on commit drop;

with upserted_courses as (
  insert into public.courses (
    tenant_id,
    title,
    slug,
    description,
    cover_image_url,
    status,
    price_cents,
    stripe_price_id,
    created_by
  )
  select
    tenant.id,
    course_data.title,
    course_data.slug,
    course_data.description,
    course_data.cover_image_url,
    'published'::public.course_status,
    0,
    null,
    instructor.id
  from qa_tenant tenant
  cross join (select id from qa_users where account_key = 'instructor') instructor
  cross join (
    values
      (
        'qa-biblical-foundations',
        'QA Biblical Foundations',
        'Core introduction to Scripture, learning rhythm, reflection, quiz, and completion tracking.',
        'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80'
      ),
      (
        'qa-ministry-leadership',
        'QA Ministry Leadership',
        'Leadership course with prerequisite access, assignment submission, gradebook, and certificate readiness.',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'
      )
  ) as course_data(slug, title, description, cover_image_url)
  on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      cover_image_url = excluded.cover_image_url,
      status = excluded.status,
      tenant_id = excluded.tenant_id,
      created_by = excluded.created_by
  returning slug, id
)
insert into qa_courses (slug, id)
select slug, id
from upserted_courses;

create temp table qa_programs (
  slug text primary key,
  id uuid not null
) on commit drop;

with upserted_programs as (
  insert into public.programs (tenant_id, name, slug, description, active)
  select
    tenant.id,
    'QA Certificate in Ministry',
    'qa-certificate-ministry',
    'Demo program used to verify program access, prerequisites, finance clearance, and certificates.',
    true
  from qa_tenant tenant
  on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      active = excluded.active,
      tenant_id = excluded.tenant_id
  returning slug, id
)
insert into qa_programs (slug, id)
select slug, id
from upserted_programs;

insert into public.program_courses (program_id, course_id, position, required)
select program.id, course.id, course_order.position, true
from qa_programs program
join (
  values
    ('qa-biblical-foundations', 1),
    ('qa-ministry-leadership', 2)
) as course_order(slug, position) on true
join qa_courses course on course.slug = course_order.slug
where program.slug = 'qa-certificate-ministry'
on conflict (program_id, course_id) do update
set position = excluded.position,
    required = excluded.required;

insert into public.course_prerequisites (course_id, prerequisite_course_id)
select leadership.id, foundations.id
from qa_courses leadership
join qa_courses foundations on foundations.slug = 'qa-biblical-foundations'
where leadership.slug = 'qa-ministry-leadership'
on conflict (course_id, prerequisite_course_id) do nothing;

create temp table qa_modules (
  course_slug text not null,
  module_key text primary key,
  id uuid not null
) on commit drop;

with inserted_modules as (
  insert into public.course_modules (course_id, title, position)
  select course.id, module_data.title, module_data.position
  from qa_courses course
  join (
    values
      ('qa-biblical-foundations', 'foundations-start', 'Orientation and Scripture Foundations', 1),
      ('qa-biblical-foundations', 'foundations-practice', 'Practice and Assessment', 2),
      ('qa-ministry-leadership', 'leadership-start', 'Leadership Practice', 1),
      ('qa-ministry-leadership', 'leadership-assessment', 'Assignment and Review', 2)
  ) as module_data(course_slug, module_key, title, position) on module_data.course_slug = course.slug
  returning id, course_id, title
)
insert into qa_modules (course_slug, module_key, id)
select course.slug, module_data.module_key, inserted.id
from inserted_modules inserted
join qa_courses course on course.id = inserted.course_id
join (
  values
    ('qa-biblical-foundations', 'foundations-start', 'Orientation and Scripture Foundations'),
    ('qa-biblical-foundations', 'foundations-practice', 'Practice and Assessment'),
    ('qa-ministry-leadership', 'leadership-start', 'Leadership Practice'),
    ('qa-ministry-leadership', 'leadership-assessment', 'Assignment and Review')
) as module_data(course_slug, module_key, title) on module_data.course_slug = course.slug and module_data.title = inserted.title;

create temp table qa_lessons (
  lesson_key text primary key,
  course_slug text not null,
  id uuid not null
) on commit drop;

with inserted_lessons as (
  insert into public.lessons (
    module_id,
    title,
    lesson_type,
    video_url,
    pdf_path,
    content,
    assignment_prompt,
    position
  )
  select
    modules.id,
    lesson_data.title,
    lesson_data.lesson_type::public.lesson_type,
    lesson_data.video_url,
    lesson_data.pdf_path,
    lesson_data.content,
    lesson_data.assignment_prompt,
    lesson_data.position
  from qa_modules modules
  join (
    values
      (
        'foundations-welcome',
        'foundations-start',
        'Welcome to Biblical Foundations',
        'text',
        null,
        null,
        'This lesson verifies text content, reading flow, and progress tracking for the student portal.',
        null,
        1
      ),
      (
        'foundations-video',
        'foundations-start',
        'How to Study Scripture',
        'video',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        null,
        'Video lesson placeholder for QA. Replace with a real institutional video before public demo.',
        null,
        2
      ),
      (
        'foundations-quiz',
        'foundations-practice',
        'Foundations Quiz',
        'quiz',
        null,
        null,
        'Quiz lesson used to verify questions, attempts, scoring, and completion.',
        null,
        1
      ),
      (
        'leadership-pdf',
        'leadership-start',
        'Leadership Reading Packet',
        'pdf',
        null,
        'qa/demo/leadership-reading-packet.pdf',
        'PDF lesson placeholder. Upload a real PDF to this storage path or replace it during instructor QA.',
        null,
        1
      ),
      (
        'leadership-assignment',
        'leadership-assessment',
        'Ministry Reflection Assignment',
        'assignment',
        null,
        null,
        'Students submit a written reflection for instructor grading.',
        'Write a 500-word reflection on how servant leadership shapes ministry practice.',
        1
      )
  ) as lesson_data(
    lesson_key,
    module_key,
    title,
    lesson_type,
    video_url,
    pdf_path,
    content,
    assignment_prompt,
    position
  ) on lesson_data.module_key = modules.module_key
  returning id, module_id, title
)
insert into qa_lessons (lesson_key, course_slug, id)
select lesson_data.lesson_key, modules.course_slug, inserted.id
from inserted_lessons inserted
join qa_modules modules on modules.id = inserted.module_id
join (
  values
    ('foundations-welcome', 'Welcome to Biblical Foundations'),
    ('foundations-video', 'How to Study Scripture'),
    ('foundations-quiz', 'Foundations Quiz'),
    ('leadership-pdf', 'Leadership Reading Packet'),
    ('leadership-assignment', 'Ministry Reflection Assignment')
) as lesson_data(lesson_key, title) on lesson_data.title = inserted.title;

create temp table qa_quizzes (
  quiz_key text primary key,
  id uuid not null
) on commit drop;

with inserted_quizzes as (
  insert into public.quizzes (lesson_id, title, passing_score)
  select lessons.id, 'Foundations Checkpoint Quiz', 70
  from qa_lessons lessons
  where lessons.lesson_key = 'foundations-quiz'
  returning id, lesson_id
)
insert into qa_quizzes (quiz_key, id)
select 'foundations-checkpoint', id
from inserted_quizzes;

insert into public.quiz_questions (quiz_id, prompt, choices, correct_answer, points, position)
select
  quizzes.id,
  question_data.prompt,
  question_data.choices::jsonb,
  question_data.correct_answer,
  question_data.points,
  question_data.position
from qa_quizzes quizzes
cross join (
  values
    (
      'What is the main QA purpose of this course?',
      '["Verify program learning flow","Process payroll","Manage DNS records"]',
      'Verify program learning flow',
      1,
      1
    ),
    (
      'What must be completed before the program certificate is issued?',
      '["Required courses and finance clearance","Only a login","Only the first lesson"]',
      'Required courses and finance clearance',
      1,
      2
    )
) as question_data(prompt, choices, correct_answer, points, position);

insert into public.program_enrollments (program_id, student_id, status)
select program.id, users.id, 'active'
from qa_programs program
cross join qa_users users
where program.slug = 'qa-certificate-ministry'
  and users.account_key in ('student_active', 'student_complete')
on conflict (program_id, student_id) do update
set status = excluded.status;

insert into public.enrollments (course_id, student_id, status, progress_percent, completed_at)
select
  course.id,
  users.id,
  enrollment_data.status::public.enrollment_status,
  enrollment_data.progress_percent,
  case when enrollment_data.status = 'completed' then now() - interval '1 day' else null end
from qa_courses course
join (
  values
    ('student_active', 'qa-biblical-foundations', 'completed', 100),
    ('student_active', 'qa-ministry-leadership', 'active', 35),
    ('student_complete', 'qa-biblical-foundations', 'completed', 100),
    ('student_complete', 'qa-ministry-leadership', 'completed', 100)
) as enrollment_data(account_key, course_slug, status, progress_percent) on enrollment_data.course_slug = course.slug
join qa_users users on users.account_key = enrollment_data.account_key
on conflict (course_id, student_id) do update
set status = excluded.status,
    progress_percent = excluded.progress_percent,
    completed_at = excluded.completed_at;

insert into public.lesson_progress (lesson_id, student_id, completed, completed_at)
select lessons.id, users.id, true, now() - interval '1 day'
from qa_lessons lessons
join qa_users users on users.account_key = 'student_complete'
on conflict (lesson_id, student_id) do update
set completed = excluded.completed,
    completed_at = excluded.completed_at;

insert into public.lesson_progress (lesson_id, student_id, completed, completed_at)
select lessons.id, users.id, true, now() - interval '2 days'
from qa_lessons lessons
join qa_users users on users.account_key = 'student_active'
where lessons.course_slug = 'qa-biblical-foundations'
on conflict (lesson_id, student_id) do update
set completed = excluded.completed,
    completed_at = excluded.completed_at;

insert into public.lesson_progress (lesson_id, student_id, completed, completed_at)
select lessons.id, users.id, true, now() - interval '4 hours'
from qa_lessons lessons
join qa_users users on users.account_key = 'student_active'
where lessons.lesson_key = 'leadership-pdf'
on conflict (lesson_id, student_id) do update
set completed = excluded.completed,
    completed_at = excluded.completed_at;

insert into public.quiz_attempts (quiz_id, student_id, answers, score, passed)
select quizzes.id, users.id, '{"1":"Verify program learning flow","2":"Required courses and finance clearance"}'::jsonb, 100, true
from qa_quizzes quizzes
join qa_users users on users.account_key in ('student_active', 'student_complete');

insert into public.assignment_submissions (
  lesson_id,
  student_id,
  submission_text,
  file_path,
  status,
  grade_score,
  max_score,
  feedback,
  graded_at
)
select
  lessons.id,
  users.id,
  'QA reflection submission: servant leadership connects formation, humility, and accountable ministry practice.',
  null,
  case when users.account_key = 'student_complete' then 'graded' else 'submitted' end,
  case when users.account_key = 'student_complete' then 95 else null end,
  100,
  case when users.account_key = 'student_complete' then 'Strong reflection with clear ministry application.' else null end,
  case when users.account_key = 'student_complete' then now() - interval '1 day' else null end
from qa_lessons lessons
join qa_users users on users.account_key in ('student_active', 'student_complete')
where lessons.lesson_key = 'leadership-assignment'
on conflict (lesson_id, student_id) do update
set submission_text = excluded.submission_text,
    status = excluded.status,
    grade_score = excluded.grade_score,
    max_score = excluded.max_score,
    feedback = excluded.feedback,
    graded_at = excluded.graded_at;

insert into public.gradebook_entries (course_id, student_id, item_name, score, max_score, feedback)
select
  course.id,
  users.id,
  grade_data.item_name,
  grade_data.score,
  100,
  grade_data.feedback
from qa_courses course
join (
  values
    ('student_active', 'qa-biblical-foundations', 'QA: Foundations Quiz', 100, 'Passed checkpoint quiz.'),
    ('student_complete', 'qa-biblical-foundations', 'QA: Foundations Quiz', 100, 'Passed checkpoint quiz.'),
    ('student_complete', 'qa-ministry-leadership', 'QA: Ministry Reflection Assignment', 95, 'Ready for certificate review.')
) as grade_data(account_key, course_slug, item_name, score, feedback) on grade_data.course_slug = course.slug
join qa_users users on users.account_key = grade_data.account_key;

insert into public.certificates (course_id, student_id, certificate_number)
select
  course.id,
  users.id,
  'QA-COURSE-' || upper(left(course.slug, 12)) || '-' || upper(left(users.account_key, 8))
from qa_courses course
join qa_users users on users.account_key in ('student_active', 'student_complete')
where (users.account_key = 'student_active' and course.slug = 'qa-biblical-foundations')
   or users.account_key = 'student_complete'
on conflict (course_id, student_id) do update
set certificate_number = excluded.certificate_number;

insert into public.finance_clearances (program_id, student_id, status, notes, cleared_by)
select
  program.id,
  users.id,
  case when users.account_key = 'student_complete' then 'cleared' else 'hold' end,
  case
    when users.account_key = 'student_complete' then 'QA account cleared for certificate verification.'
    else 'QA account intentionally on hold for finance workflow testing.'
  end,
  case when users.account_key = 'student_complete' then admin_user.id else null end
from qa_programs program
join qa_users users on users.account_key in ('student_active', 'student_complete')
cross join (select id from qa_users where account_key = 'institution_admin') admin_user
where program.slug = 'qa-certificate-ministry'
on conflict (program_id, student_id) do update
set status = excluded.status,
    notes = excluded.notes,
    cleared_by = excluded.cleared_by;

insert into public.program_certificates (program_id, student_id, certificate_number, issued_by)
select
  program.id,
  student.id,
  'QA-PROG-' || upper(left(program.slug, 10)) || '-' || upper(left(student.id::text, 8)),
  admin_user.id
from qa_programs program
join qa_users student on student.account_key = 'student_complete'
cross join (select id from qa_users where account_key = 'institution_admin') admin_user
where program.slug = 'qa-certificate-ministry'
on conflict (program_id, student_id) do update
set certificate_number = excluded.certificate_number,
    issued_by = excluded.issued_by;

commit;
