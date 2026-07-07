import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { escapeHtml, renderEmail, sendEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const ALERT_THRESHOLD_DAYS = 15;
const DROP_THRESHOLD_DAYS = 20;

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

type EnrollmentForCheck = {
  id: string;
  course_id: string;
  student_id: string;
  last_activity_at: string;
  courses?: { title?: string | null; tenant_id?: string | null; created_by?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

async function tenantAdminEmails(admin: ReturnType<typeof createSupabaseAdminClient>, tenantId: string) {
  const { data } = await admin
    .from("tenant_memberships")
    .select("profiles:user_id(email)")
    .eq("tenant_id", tenantId)
    .eq("role", "admin")
    .eq("status", "active");

  return (data ?? [])
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return profile?.email ?? null;
    })
    .filter((email): email is string => Boolean(email));
}

async function instructorEmail(admin: ReturnType<typeof createSupabaseAdminClient>, instructorId: string | null | undefined) {
  if (!instructorId) {
    return null;
  }

  const { data } = await admin.from("profiles").select("email").eq("id", instructorId).maybeSingle();
  return data?.email ?? null;
}

/**
 * Daily job (triggered by a GitHub Actions schedule, see .github/workflows/inactivity-check.yml)
 * that alerts on 15 days of student inactivity and auto-drops at 20 days. Protected by a shared
 * secret so it can't be triggered by an arbitrary request.
 */
export async function POST(request: Request) {
  const expectedSecret = env("CRON_SECRET");

  if (!expectedSecret || request.headers.get("x-cron-secret") !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  let alerted = 0;
  let dropped = 0;

  // Auto-drop first: an enrollment that has crossed 20 days should be dropped even if it never got
  // (or already got) the 15-day alert — no need to alert-then-immediately-drop in the same run.
  const { data: toDrop } = await admin
    .from("enrollments")
    .select("id,course_id,student_id,last_activity_at,courses:course_id(title,tenant_id,created_by),profiles:student_id(full_name,email)")
    .eq("status", "active")
    .lte("last_activity_at", daysAgoIso(DROP_THRESHOLD_DAYS));

  for (const enrollment of (toDrop ?? []) as EnrollmentForCheck[]) {
    const { error } = await admin
      .from("enrollments")
      .update({ status: "dropped", dropped_automatically: true })
      .eq("id", enrollment.id);

    if (error) {
      continue;
    }

    dropped += 1;
    const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
    const student = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
    const [adminEmails, instructor] = await Promise.all([
      course?.tenant_id ? tenantAdminEmails(admin, course.tenant_id) : Promise.resolve([]),
      instructorEmail(admin, course?.created_by)
    ]);
    const recipients = [student?.email, instructor, ...adminEmails].filter((value): value is string => Boolean(value));

    if (recipients.length) {
      const studentName = escapeHtml(student?.full_name ?? "The student");
      const courseTitle = escapeHtml(course?.title ?? "the course");
      await sendEmail({
        to: recipients,
        subject: `Withdrawn from ${course?.title ?? "a course"} due to inactivity`,
        html: renderEmail({
          heading: "Course withdrawal — inactivity",
          body: `<p>${studentName} has been automatically withdrawn from <strong>${courseTitle}</strong> after ${DROP_THRESHOLD_DAYS} days without completing any lesson, quiz, or assignment.</p><p>An admin can reactivate this enrollment from the admin dashboard if this was in error.</p>`
        })
      });
    }
  }

  // 15-day alert: only enrollments that haven't already crossed the 20-day drop threshold and
  // haven't already had an alert sent since their last activity.
  const { data: toAlert } = await admin
    .from("enrollments")
    .select("id,course_id,student_id,last_activity_at,courses:course_id(title,tenant_id,created_by),profiles:student_id(full_name,email)")
    .eq("status", "active")
    .is("inactivity_alert_sent_at", null)
    .lte("last_activity_at", daysAgoIso(ALERT_THRESHOLD_DAYS))
    .gt("last_activity_at", daysAgoIso(DROP_THRESHOLD_DAYS));

  for (const enrollment of (toAlert ?? []) as EnrollmentForCheck[]) {
    const { error } = await admin
      .from("enrollments")
      .update({ inactivity_alert_sent_at: new Date().toISOString() })
      .eq("id", enrollment.id);

    if (error) {
      continue;
    }

    alerted += 1;
    const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
    const student = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
    const [adminEmails, instructor] = await Promise.all([
      course?.tenant_id ? tenantAdminEmails(admin, course.tenant_id) : Promise.resolve([]),
      instructorEmail(admin, course?.created_by)
    ]);
    const recipients = [student?.email, instructor, ...adminEmails].filter((value): value is string => Boolean(value));

    if (recipients.length) {
      const studentName = escapeHtml(student?.full_name ?? "The student");
      const courseTitle = escapeHtml(course?.title ?? "the course");
      await sendEmail({
        to: recipients,
        subject: `Inactivity alert — ${course?.title ?? "a course"}`,
        html: renderEmail({
          heading: "Inactivity alert",
          body: `<p>${studentName} has not completed a lesson, quiz, or assignment in <strong>${courseTitle}</strong> for ${ALERT_THRESHOLD_DAYS} days.</p><p>Without activity, the student will be automatically withdrawn from the course after ${DROP_THRESHOLD_DAYS} days of inactivity.</p>`
        })
      });
    }
  }

  return NextResponse.json({ alerted, dropped });
}
