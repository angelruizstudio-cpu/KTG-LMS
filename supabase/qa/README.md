# LMS QA demo data

These scripts prepare a clean demo dataset for pre-demo testing.

## 1. Create Auth users first

In Supabase Dashboard, go to **Authentication -> Users** and create these users before running the seed script.

Use a temporary password you can share with the QA team, for example `DosisDemo2026!`.

If you want password reset testing with real inboxes, replace these emails in `001_seed_demo_data.sql` before running it.

| Test role | Default email | Login method |
| --- | --- | --- |
| Platform admin | `platform.admin@dosisdemo.test` | Email + password at `/platform/login` |
| Institution admin | `institution.admin@dosisdemo.test` | Institution ID `DEMO-ADMIN-001` |
| Instructor | `instructor@dosisdemo.test` | Institution ID `DEMO-INST-001` |
| Active student | `student.active@dosisdemo.test` | Institution ID `DEMO-STUD-001` |
| Completed student | `student.complete@dosisdemo.test` | Institution ID `DEMO-STUD-002` |

## 2. Run the seed

Open Supabase **SQL Editor** and run:

1. `supabase/qa/001_seed_demo_data.sql`
2. `supabase/qa/002_verify_demo_data.sql`

The seed is idempotent. It removes only QA/demo courses and programs with `qa-` slugs, then recreates them.

## 3. What gets created

- Dosis Educa tenant access for all QA users.
- Institution login IDs for admin, instructor, and students.
- Platform admin access for the platform test user.
- One certificate program with two required courses.
- Course modules and lessons covering text, video, PDF, assignment, and quiz.
- Prerequisite rule: course 2 requires course 1.
- Active student with course 1 completed and course 2 in progress.
- Completed student with all required courses completed, finance cleared, and a program certificate.
- Quiz attempts, assignment submission, gradebook entries, course certificates, finance clearance, and program certificate.

## 4. Expected checks

- Platform admin can log into `/platform/login`.
- Institution admin can log into `/auth/login` with `DEMO-ADMIN-001`.
- Instructor can see courses, enrolled students, assignments, and gradebook.
- Active student sees assigned program courses and progress.
- Completed student sees certificates.
- Finance center shows one hold and one cleared record.
