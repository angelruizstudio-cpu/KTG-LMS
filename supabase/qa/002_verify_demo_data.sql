-- Dosis Educa LMS QA/demo verification.
-- Run after 001_seed_demo_data.sql.

with qa_tenant as (
  select id, name, slug
  from public.tenants
  where slug = 'dosis-educa'
),
qa_courses as (
  select id, title, slug, status
  from public.courses
  where slug in ('qa-biblical-foundations', 'qa-ministry-leadership')
),
qa_programs as (
  select id, name, slug
  from public.programs
  where slug = 'qa-certificate-ministry'
),
qa_users as (
  select
    profiles.id,
    profiles.email,
    profiles.full_name,
    profiles.role,
    identities.institution_user_id
  from public.profiles
  left join public.tenant_user_identities identities on identities.user_id = profiles.id
  where profiles.email in (
    'platform.admin@dosisdemo.test',
    'institution.admin@dosisdemo.test',
    'instructor@dosisdemo.test',
    'student.active@dosisdemo.test',
    'student.complete@dosisdemo.test'
  )
)
select 'tenant' as check_name, count(*)::text as result
from qa_tenant
union all
select 'qa users', count(*)::text
from qa_users
union all
select 'platform admins', count(*)::text
from public.platform_admins platform_admins
join qa_users users on users.id = platform_admins.user_id
where platform_admins.status = 'active'
union all
select 'institution identities', count(*)::text
from qa_users
where institution_user_id in ('DEMO-ADMIN-001', 'DEMO-INST-001', 'DEMO-STUD-001', 'DEMO-STUD-002')
union all
select 'qa programs', count(*)::text
from qa_programs
union all
select 'qa courses', count(*)::text
from qa_courses
union all
select 'program courses', count(*)::text
from public.program_courses program_courses
join qa_programs programs on programs.id = program_courses.program_id
union all
select 'course prerequisites', count(*)::text
from public.course_prerequisites prerequisites
join qa_courses courses on courses.id = prerequisites.course_id
union all
select 'modules', count(*)::text
from public.course_modules modules
join qa_courses courses on courses.id = modules.course_id
union all
select 'lessons', count(*)::text
from public.lessons lessons
join public.course_modules modules on modules.id = lessons.module_id
join qa_courses courses on courses.id = modules.course_id
union all
select 'quizzes', count(*)::text
from public.quizzes quizzes
join public.lessons lessons on lessons.id = quizzes.lesson_id
join public.course_modules modules on modules.id = lessons.module_id
join qa_courses courses on courses.id = modules.course_id
union all
select 'program enrollments', count(*)::text
from public.program_enrollments enrollments
join qa_programs programs on programs.id = enrollments.program_id
union all
select 'course enrollments', count(*)::text
from public.enrollments enrollments
join qa_courses courses on courses.id = enrollments.course_id
union all
select 'finance records', count(*)::text
from public.finance_clearances finance
join qa_programs programs on programs.id = finance.program_id
union all
select 'program certificates', count(*)::text
from public.program_certificates certificates
join qa_programs programs on programs.id = certificates.program_id;

select
  users.full_name,
  users.email,
  users.role,
  users.institution_user_id,
  coalesce(programs.name, 'No program') as program_name,
  coalesce(program_enrollments.status, 'not enrolled') as program_status,
  coalesce(finance.status, 'no finance record') as finance_status,
  count(enrollments.id) filter (where enrollments.status = 'completed') as completed_courses,
  count(enrollments.id) as assigned_courses,
  max(program_certificates.certificate_number) as program_certificate
from (
  select
    profiles.id,
    profiles.email,
    profiles.full_name,
    profiles.role,
    identities.institution_user_id
  from public.profiles
  left join public.tenant_user_identities identities on identities.user_id = profiles.id
  where profiles.email in (
    'institution.admin@dosisdemo.test',
    'instructor@dosisdemo.test',
    'student.active@dosisdemo.test',
    'student.complete@dosisdemo.test'
  )
) users
left join public.program_enrollments program_enrollments on program_enrollments.student_id = users.id
left join public.programs programs on programs.id = program_enrollments.program_id
left join public.finance_clearances finance on finance.program_id = programs.id and finance.student_id = users.id
left join public.program_certificates program_certificates on program_certificates.program_id = programs.id and program_certificates.student_id = users.id
left join public.enrollments enrollments on enrollments.student_id = users.id
group by
  users.full_name,
  users.email,
  users.role,
  users.institution_user_id,
  programs.name,
  program_enrollments.status,
  finance.status
order by users.role, users.full_name;
