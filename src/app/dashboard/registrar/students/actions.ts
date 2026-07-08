"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createInstitutionUser } from "@/lib/institution-user";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const createStudentSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function createStudentAction(formData: FormData) {
  const { profile } = await requireProfile(["registrar", "admin"]);
  const parsed = createStudentSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect("/dashboard/registrar/students?error=Student details are invalid.");
  }

  const admin = createSupabaseAdminClient();
  // The role is always "student" here, regardless of anything in the form — a registrar must
  // never be able to create an instructor/admin account through this action.
  const result = await createInstitutionUser(admin, { tenantId: profile.default_tenant_id, ...parsed.data, role: "student" });

  if (!result.ok) {
    redirect(`/dashboard/registrar/students?error=${encodeURIComponent(result.message)}`);
  }

  revalidatePath("/dashboard/registrar/students");
  redirect(`/dashboard/registrar/students?created=${encodeURIComponent(result.institutionUserId)}`);
}

const updateContactSchema = z.object({
  studentId: z.string().uuid(),
  fullName: z.string().min(2),
  email: z.string().email()
});

export async function updateStudentContactAction(formData: FormData) {
  await requireProfile(["registrar", "admin"]);
  const parsed = updateContactSchema.safeParse({
    studentId: formData.get("studentId"),
    fullName: formData.get("fullName"),
    email: formData.get("email")
  });

  if (!parsed.success) {
    redirect(`/dashboard/registrar/students/${String(formData.get("studentId"))}?error=Contact details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, email: parsed.data.email })
    .eq("id", parsed.data.studentId)
    .eq("role", "student");

  if (error) {
    redirect(`/dashboard/registrar/students/${parsed.data.studentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/registrar/students/${parsed.data.studentId}`);
  revalidatePath("/dashboard/registrar/students");
}

const academicStatusSchema = z.object({
  studentId: z.string().uuid(),
  academicStatus: z.enum(["active", "inactive", "withdrawn", "graduated", "suspended"])
});

export async function updateAcademicStatusAction(formData: FormData) {
  await requireProfile(["registrar", "admin"]);
  const parsed = academicStatusSchema.safeParse({
    studentId: formData.get("studentId"),
    academicStatus: formData.get("academicStatus")
  });

  if (!parsed.success) {
    redirect(`/dashboard/registrar/students/${String(formData.get("studentId"))}?error=Academic status is invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ academic_status: parsed.data.academicStatus })
    .eq("id", parsed.data.studentId)
    .eq("role", "student");

  if (error) {
    redirect(`/dashboard/registrar/students/${parsed.data.studentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/registrar/students/${parsed.data.studentId}`);
  revalidatePath("/dashboard/registrar/students");
}

const archiveSchema = z.object({
  studentId: z.string().uuid()
});

export async function archiveStudentAction(formData: FormData) {
  await requireProfile(["registrar", "admin"]);
  const parsed = archiveSchema.safeParse({ studentId: formData.get("studentId") });

  if (!parsed.success) {
    redirect("/dashboard/registrar/students?error=Unable to archive student.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.studentId)
    .eq("role", "student");

  if (error) {
    redirect(`/dashboard/registrar/students/${parsed.data.studentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/registrar/students");
  redirect("/dashboard/registrar/students?archived=1");
}

export async function unarchiveStudentAction(formData: FormData) {
  await requireProfile(["registrar", "admin"]);
  const parsed = archiveSchema.safeParse({ studentId: formData.get("studentId") });

  if (!parsed.success) {
    redirect("/dashboard/registrar/students?error=Unable to restore student.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ archived_at: null })
    .eq("id", parsed.data.studentId)
    .eq("role", "student");

  if (error) {
    redirect(`/dashboard/registrar/students/${parsed.data.studentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/registrar/students/${parsed.data.studentId}`);
  revalidatePath("/dashboard/registrar/students");
}

const withdrawSchema = z.object({
  studentId: z.string().uuid(),
  enrollmentId: z.string().uuid()
});

/**
 * Manual withdrawal by staff, distinct from the automatic 15/20-day inactivity withdrawal: this
 * never sets dropped_automatically, so it never shows a "Reactivate" button — a deliberate manual
 * withdrawal is re-enrolled the normal way (grant course access again), not "undone".
 */
export async function withdrawFromCourseAction(formData: FormData) {
  await requireProfile(["registrar", "admin"]);
  const parsed = withdrawSchema.safeParse({
    studentId: formData.get("studentId"),
    enrollmentId: formData.get("enrollmentId")
  });

  if (!parsed.success) {
    redirect(`/dashboard/registrar/students/${String(formData.get("studentId"))}?error=Unable to withdraw from course.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ status: "dropped" })
    .eq("id", parsed.data.enrollmentId)
    .eq("student_id", parsed.data.studentId);

  if (error) {
    redirect(`/dashboard/registrar/students/${parsed.data.studentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/registrar/students/${parsed.data.studentId}`);
}

const transferSchema = z.object({
  studentId: z.string().uuid(),
  fromEnrollmentId: z.string().uuid(),
  toCourseId: z.string().uuid()
});

/**
 * Transfer a student from one course to another in a single staff action: withdraws the source
 * enrollment and grants the target course directly. This intentionally skips the prerequisite
 * check that grantCourseAccessAction enforces for normal self-progression — a registrar-initiated
 * transfer is a deliberate administrative override (e.g. moving sections), not routine advancement.
 */
export async function transferEnrollmentAction(formData: FormData) {
  await requireProfile(["registrar", "admin"]);
  const parsed = transferSchema.safeParse({
    studentId: formData.get("studentId"),
    fromEnrollmentId: formData.get("fromEnrollmentId"),
    toCourseId: formData.get("toCourseId")
  });

  if (!parsed.success) {
    redirect(`/dashboard/registrar/students/${String(formData.get("studentId"))}?error=Transfer details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: withdrawError } = await supabase
    .from("enrollments")
    .update({ status: "dropped" })
    .eq("id", parsed.data.fromEnrollmentId)
    .eq("student_id", parsed.data.studentId);

  if (withdrawError) {
    redirect(`/dashboard/registrar/students/${parsed.data.studentId}?error=${encodeURIComponent(withdrawError.message)}`);
  }

  const { error: grantError } = await supabase.from("enrollments").upsert(
    {
      course_id: parsed.data.toCourseId,
      student_id: parsed.data.studentId,
      status: "active"
    },
    { onConflict: "course_id,student_id" }
  );

  if (grantError) {
    redirect(`/dashboard/registrar/students/${parsed.data.studentId}?error=${encodeURIComponent(grantError.message)}`);
  }

  revalidatePath(`/dashboard/registrar/students/${parsed.data.studentId}`);
}
