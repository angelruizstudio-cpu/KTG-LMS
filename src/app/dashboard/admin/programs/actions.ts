"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const programSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

const programCourseSchema = z.object({
  programId: z.string().uuid(),
  courseId: z.string().uuid(),
  position: z.coerce.number().int().min(1),
  required: z.boolean().default(true)
});

const programEnrollmentSchema = z.object({
  programId: z.string().uuid(),
  studentId: z.string().uuid()
});

const prerequisiteSchema = z.object({
  courseId: z.string().uuid(),
  prerequisiteCourseId: z.string().uuid()
});

const courseAccessSchema = z.object({
  courseId: z.string().uuid(),
  studentId: z.string().uuid()
});

const eligibleProgramAccessSchema = z.object({
  programId: z.string().uuid(),
  studentId: z.string().uuid()
});

const financeClearanceSchema = z.object({
  programId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.enum(["hold", "cleared"]),
  notes: z.string().optional(),
  returnTo: z.enum(["programs", "finance"]).default("programs")
});

const certificateRequestSchema = z.object({
  programId: z.string().uuid(),
  studentId: z.string().uuid(),
  returnTo: z.enum(["programs", "finance"]).default("programs")
});

function adminTargetPath(returnTo: "programs" | "finance") {
  return returnTo === "finance" ? "/dashboard/admin/finance" : "/dashboard/admin/programs";
}

export async function createProgramAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = programSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || ""
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/programs?error=Program details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("programs").insert({
    tenant_id: profile.default_tenant_id,
    name: parsed.data.name,
    slug: `${slugify(parsed.data.name)}-${Date.now().toString(36)}`,
    description: parsed.data.description || null
  });

  if (error) {
    redirect(`/dashboard/admin/programs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/programs");
}

export async function addCourseToProgramAction(formData: FormData) {
  await requireProfile(["admin"]);
  const parsed = programCourseSchema.safeParse({
    programId: formData.get("programId"),
    courseId: formData.get("courseId"),
    position: formData.get("position") || 1,
    required: formData.get("required") === "on"
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/programs?error=Program course details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("program_courses").upsert(
    {
      program_id: parsed.data.programId,
      course_id: parsed.data.courseId,
      position: parsed.data.position,
      required: parsed.data.required
    },
    { onConflict: "program_id,course_id" }
  );

  if (error) {
    redirect(`/dashboard/admin/programs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/programs");
}

export async function assignStudentToProgramAction(formData: FormData) {
  await requireProfile(["admin"]);
  const parsed = programEnrollmentSchema.safeParse({
    programId: formData.get("programId"),
    studentId: formData.get("studentId")
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/programs?error=Program enrollment details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("program_enrollments").upsert(
    {
      program_id: parsed.data.programId,
      student_id: parsed.data.studentId,
      status: "active"
    },
    { onConflict: "program_id,student_id" }
  );

  if (error) {
    redirect(`/dashboard/admin/programs?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("finance_clearances").upsert(
    {
      program_id: parsed.data.programId,
      student_id: parsed.data.studentId,
      status: "hold",
      notes: "Pending finance verification"
    },
    { onConflict: "program_id,student_id" }
  );

  revalidatePath("/dashboard/admin/programs");
}

export async function addPrerequisiteAction(formData: FormData) {
  await requireProfile(["admin"]);
  const parsed = prerequisiteSchema.safeParse({
    courseId: formData.get("courseId"),
    prerequisiteCourseId: formData.get("prerequisiteCourseId")
  });

  if (!parsed.success || parsed.data.courseId === parsed.data.prerequisiteCourseId) {
    redirect("/dashboard/admin/programs?error=Prerequisite details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("course_prerequisites").upsert(
    {
      course_id: parsed.data.courseId,
      prerequisite_course_id: parsed.data.prerequisiteCourseId
    },
    { onConflict: "course_id,prerequisite_course_id" }
  );

  if (error) {
    redirect(`/dashboard/admin/programs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/programs");
}

export async function grantCourseAccessAction(formData: FormData) {
  await requireProfile(["admin"]);
  const parsed = courseAccessSchema.safeParse({
    courseId: formData.get("courseId"),
    studentId: formData.get("studentId")
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/programs?error=Course access details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: programCourses } = await supabase.from("program_courses").select("program_id").eq("course_id", parsed.data.courseId);
  const programIds = (programCourses ?? []).map((programCourse) => programCourse.program_id);

  if (!programIds.length) {
    redirect("/dashboard/admin/programs?error=That course is not attached to a program.");
  }

  const { data: activeProgramEnrollment } = await supabase
    .from("program_enrollments")
    .select("id")
    .eq("student_id", parsed.data.studentId)
    .eq("status", "active")
    .in("program_id", programIds)
    .limit(1)
    .maybeSingle();

  if (!activeProgramEnrollment) {
    redirect("/dashboard/admin/programs?error=Student must be assigned to a program containing that course.");
  }

  const { data: prerequisites } = await supabase
    .from("course_prerequisites")
    .select("prerequisite_course_id")
    .eq("course_id", parsed.data.courseId);
  const prerequisiteIds = (prerequisites ?? []).map((prerequisite) => prerequisite.prerequisite_course_id);

  if (prerequisiteIds.length) {
    const { data: completedPrerequisites } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", parsed.data.studentId)
      .eq("status", "completed")
      .in("course_id", prerequisiteIds);
    const completedIds = new Set((completedPrerequisites ?? []).map((enrollment) => enrollment.course_id));
    const hasMissingPrerequisites = prerequisiteIds.some((courseId) => !completedIds.has(courseId));

    if (hasMissingPrerequisites) {
      redirect("/dashboard/admin/programs?error=Prerequisites must be completed before granting this course.");
    }
  }

  const { error } = await supabase.from("enrollments").upsert(
    {
      course_id: parsed.data.courseId,
      student_id: parsed.data.studentId,
      status: "active"
    },
    { onConflict: "course_id,student_id" }
  );

  if (error) {
    redirect(`/dashboard/admin/programs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/programs");
}

export async function grantEligibleProgramAccessAction(formData: FormData) {
  await requireProfile(["admin"]);
  const parsed = eligibleProgramAccessSchema.safeParse({
    programId: formData.get("programId"),
    studentId: formData.get("studentId")
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/programs?error=Program access details are invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: programEnrollment } = await supabase
    .from("program_enrollments")
    .select("id")
    .eq("program_id", parsed.data.programId)
    .eq("student_id", parsed.data.studentId)
    .eq("status", "active")
    .maybeSingle();

  if (!programEnrollment) {
    redirect("/dashboard/admin/programs?error=Student must be assigned to the program first.");
  }

  const { data: programCourses } = await supabase
    .from("program_courses")
    .select("course_id,position")
    .eq("program_id", parsed.data.programId)
    .order("position");
  const courseIds = (programCourses ?? []).map((programCourse) => programCourse.course_id);

  if (!courseIds.length) {
    redirect("/dashboard/admin/programs?error=This program does not have courses yet.");
  }

  const [{ data: existingEnrollments }, { data: prerequisites }] = await Promise.all([
    supabase.from("enrollments").select("course_id,status").eq("student_id", parsed.data.studentId).in("course_id", courseIds),
    supabase.from("course_prerequisites").select("course_id,prerequisite_course_id").in("course_id", courseIds)
  ]);

  const existingCourseIds = new Set((existingEnrollments ?? []).map((enrollment) => enrollment.course_id));
  const completedCourseIds = new Set(
    (existingEnrollments ?? []).filter((enrollment) => enrollment.status === "completed").map((enrollment) => enrollment.course_id)
  );
  const prerequisitesByCourse = (prerequisites ?? []).reduce<Record<string, string[]>>((acc, prerequisite) => {
    acc[prerequisite.course_id] = [...(acc[prerequisite.course_id] ?? []), prerequisite.prerequisite_course_id];
    return acc;
  }, {});
  const eligibleCourseIds = courseIds.filter((courseId) => {
    if (existingCourseIds.has(courseId)) {
      return false;
    }

    return (prerequisitesByCourse[courseId] ?? []).every((prerequisiteCourseId) => completedCourseIds.has(prerequisiteCourseId));
  });

  if (!eligibleCourseIds.length) {
    redirect("/dashboard/admin/programs?error=No eligible courses are ready to open for this student.");
  }

  const { error } = await supabase.from("enrollments").upsert(
    eligibleCourseIds.map((courseId) => ({
      course_id: courseId,
      student_id: parsed.data.studentId,
      status: "active" as const
    })),
    { onConflict: "course_id,student_id" }
  );

  if (error) {
    redirect(`/dashboard/admin/programs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/programs");
  redirect(`/dashboard/admin/programs?access=${eligibleCourseIds.length}`);
}

export async function updateFinanceClearanceAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = financeClearanceSchema.safeParse({
    programId: formData.get("programId"),
    studentId: formData.get("studentId"),
    status: formData.get("status"),
    notes: formData.get("notes") || "",
    returnTo: formData.get("returnTo") || "programs"
  });

  if (!parsed.success) {
    const targetPath = String(formData.get("returnTo")) === "finance" ? "/dashboard/admin/finance" : "/dashboard/admin/programs";
    redirect(`${targetPath}?error=Finance clearance details are invalid.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("finance_clearances").upsert(
    {
      program_id: parsed.data.programId,
      student_id: parsed.data.studentId,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      cleared_by: parsed.data.status === "cleared" ? profile.id : null
    },
    { onConflict: "program_id,student_id" }
  );

  if (error) {
    redirect(`${adminTargetPath(parsed.data.returnTo)}?error=${encodeURIComponent(error.message)}`);
  }

  if (parsed.data.status === "cleared") {
    await issueProgramCertificateIfEligible(parsed.data.programId, parsed.data.studentId, profile.id);
  }

  revalidatePath("/dashboard/admin/programs");
  revalidatePath("/dashboard/admin/finance");
  revalidatePath("/dashboard/student/certificates");
}

export async function issueProgramCertificateAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = certificateRequestSchema.safeParse({
    programId: formData.get("programId"),
    studentId: formData.get("studentId"),
    returnTo: formData.get("returnTo") || "programs"
  });

  if (!parsed.success) {
    const targetPath = String(formData.get("returnTo")) === "finance" ? "/dashboard/admin/finance" : "/dashboard/admin/programs";
    redirect(`${targetPath}?error=Certificate details are invalid.`);
  }

  const issued = await issueProgramCertificateIfEligible(parsed.data.programId, parsed.data.studentId, profile.id);
  if (!issued) {
    redirect(
      `${adminTargetPath(parsed.data.returnTo)}?error=${encodeURIComponent(
        "Certificate cannot be issued yet. Confirm all required courses are completed and finance is cleared."
      )}`
    );
  }

  revalidatePath("/dashboard/admin/programs");
  revalidatePath("/dashboard/admin/finance");
  revalidatePath("/dashboard/student/certificates");
}

async function issueProgramCertificateIfEligible(programId: string, studentId: string, issuedBy: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: programCourses }, { data: financeClearance }, { data: existingCertificate }] = await Promise.all([
    supabase.from("program_courses").select("course_id").eq("program_id", programId).eq("required", true),
    supabase.from("finance_clearances").select("status").eq("program_id", programId).eq("student_id", studentId).maybeSingle(),
    supabase.from("program_certificates").select("id").eq("program_id", programId).eq("student_id", studentId).maybeSingle()
  ]);

  if (existingCertificate || financeClearance?.status !== "cleared") {
    return false;
  }

  const requiredCourseIds = (programCourses ?? []).map((course) => course.course_id);
  if (!requiredCourseIds.length) {
    return false;
  }

  const { data: completedEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .in("course_id", requiredCourseIds);

  const completedCourseIds = new Set((completedEnrollments ?? []).map((enrollment) => enrollment.course_id));
  const completedAllRequiredCourses = requiredCourseIds.every((courseId) => completedCourseIds.has(courseId));

  if (!completedAllRequiredCourses) {
    return false;
  }

  const { error } = await supabase.from("program_certificates").upsert(
    {
      program_id: programId,
      student_id: studentId,
      issued_by: issuedBy,
      certificate_number: `PROG-${programId.slice(0, 8).toUpperCase()}-${studentId.slice(0, 8).toUpperCase()}`
    },
    { onConflict: "program_id,student_id" }
  );

  return !error;
}
