# Dosis Educa LMS

A custom LMS starter for Dosis de Esperanza Educa built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Supabase PostgreSQL, Supabase Storage, and Stripe.

## Features

- Public landing page
- Login and registration with Supabase Auth
- Protected dashboard routes
- Role-based dashboards for admins, instructors, and students
- Multi-tenant foundation with tenant-scoped users, programs, courses, and RLS
- Institution ID login, e.g. `DOSIS-000001`, resolved automatically to the right tenant
- Separate platform admin portal for managing LMS institutions
- Admin user management and instructor creation
- Instructor course creation with modules and lessons
- Lesson support for video links, PDF storage paths, text, assignments, and quizzes
- Program-based student access, prerequisites, and progress tracking
- Instructor enrolled-student view
- Basic quiz attempts and gradebook entries
- Program certificate records generated after all required courses are complete and finance clearance is approved
- Stripe Checkout enrollment flow for paid courses
- Supabase Row Level Security policies

## Tech stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Supabase Auth, Database, Storage, and RLS
- Stripe Checkout and webhooks

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Supabase and Stripe values:

   ```bash
   NEXT_PUBLIC_SITE_URL=http://localhost:3001
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. Run the Supabase schema:

   Open the Supabase SQL editor and execute `supabase/schema.sql`.

5. Create the first admin:

   Register normally in the app, then promote that profile in Supabase:

   ```sql
   insert into public.tenant_memberships (tenant_id, user_id, role)
   select default_tenant_id, id, 'admin'
   from public.profiles
   where email = 'you@example.com'
   on conflict (tenant_id, user_id) do update set role = 'admin', status = 'active';

   update public.profiles
   set role = 'admin'
   where email = 'you@example.com';
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3001`.

## Stripe setup

Stripe is scaffolded for paid access, but the current academic flow grants course access by program assignment and prerequisites. Keep Stripe keys configured if you plan to charge tuition or fees later.

Paid courses can use the course `stripe_price_id`. Create a product and recurring or one-time price in Stripe, then paste the `price_...` ID when creating a course.

For local webhook testing:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Use the generated webhook secret as `STRIPE_WEBHOOK_SECRET`.

When Checkout completes, the webhook creates or updates the student enrollment from the session metadata.

## Multi-tenant access model

The starter creates a default tenant named `Dosis Educa`. Every user belongs to a tenant through `tenant_memberships`, and every program/course is scoped to a tenant. Students do not browse an open marketplace; administrators assign students to programs and grant access to specific courses as prerequisites and availability allow.

Users may belong to more than one tenant. Each tenant membership receives a unique institution ID in `tenant_user_identities`, such as `DOSIS-000001`. Institution users log in with that ID and their password, so they do not choose an institution during login. The ID resolves the tenant automatically and sets `profiles.default_tenant_id`.

Platform-level LMS administrators use `/platform/login`. Institution admins use the regular institution login and manage only their active tenant from `/dashboard/admin`.

Platform admins create institutions from `/platform`. Each new institution gets a code, slug, and first institution admin. Institution admins manage members, courses, programs, finance clearance, and certificates inside their own dashboard.

Certificates are issued at the program level only when all required program courses are completed and the finance clearance for that student/program is marked `cleared`.

To make an existing user a platform admin:

```sql
insert into public.platform_admins (user_id)
select id from public.profiles where email = 'you@example.com'
on conflict (user_id) do update set status = 'active';
```

## Supabase Storage

The schema creates a private `lesson-files` bucket. Instructors and admins can upload files, and authenticated users can read course materials. The current v1 UI stores a PDF path on lessons; a production upload widget can be added on top of the existing bucket policy.

## Folder structure

```text
src/
  app/
    api/stripe/webhook/
    auth/
    dashboard/
      admin/
      instructor/
      student/
  components/
    layout/
    ui/
  lib/
    supabase/
  types/
supabase/
  schema.sql
```

## Useful commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```

## Notes for production

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Review RLS policies after adding new features.
- Add `tenant_id` or parent-table tenant checks to every new table before exposing it in the UI.
- Add file upload UI for PDFs and video assets if you want instructors to upload directly instead of storing external links.
- Add richer quiz authoring screens and assignment submission review as the next version.
- Replace the starter certificate card with server-side PDF rendering if printable certificates are required.
