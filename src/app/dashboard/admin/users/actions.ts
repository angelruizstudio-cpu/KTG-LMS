"use server";

import { randomBytes } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const userSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "instructor", "student"])
});

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "instructor", "student"])
});

type NewInstitutionUser = {
  tenantId: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};

/**
 * Create one institution user end-to-end: auth account, profile, tenant membership, and an
 * issued institution ID. Shared by the single-user form and the CSV bulk-import action so the
 * 5-step sequence only lives in one place.
 */
async function createInstitutionUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: NewInstitutionUser
): Promise<{ ok: true; institutionUserId: string } | { ok: false; message: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      role: input.role,
      tenant_id: input.tenantId
    }
  });

  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "Unable to create user." };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email: input.email,
    full_name: input.fullName,
    role: input.role,
    default_tenant_id: input.tenantId
  });

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const { error: membershipError } = await admin.from("tenant_memberships").upsert(
    {
      tenant_id: input.tenantId,
      user_id: data.user.id,
      role: input.role,
      status: "active"
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (membershipError) {
    return { ok: false, message: membershipError.message };
  }

  const { data: institutionUserId } = await admin.rpc("next_institution_user_id", { tenant_uuid: input.tenantId });
  const issuedInstitutionUserId = institutionUserId ?? `USER-${data.user.id.slice(0, 6).toUpperCase()}`;
  const { error: identityError } = await admin.from("tenant_user_identities").upsert(
    {
      tenant_id: input.tenantId,
      user_id: data.user.id,
      institution_user_id: issuedInstitutionUserId,
      role: input.role,
      status: "active"
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (identityError) {
    return { ok: false, message: identityError.message };
  }

  return { ok: true, institutionUserId: issuedInstitutionUserId };
}

export async function createInstructorAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = userSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "student"
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/users?error=User details are invalid.");
  }

  const admin = createSupabaseAdminClient();
  const result = await createInstitutionUser(admin, { tenantId: profile.default_tenant_id, ...parsed.data });

  if (!result.ok) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(result.message)}`);
  }

  revalidatePath("/dashboard/admin/users");
  redirect(`/dashboard/admin/users?created=${encodeURIComponent(result.institutionUserId)}`);
}

export async function updateUserRoleAction(formData: FormData) {
  const { profile } = await requireProfile(["admin"]);
  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect("/dashboard/admin/users?error=Role update is invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role as UserRole })
    .eq("id", parsed.data.userId);

  if (error) {
    redirect(`/dashboard/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  await supabase
    .from("tenant_memberships")
    .update({ role: parsed.data.role as UserRole })
    .eq("tenant_id", profile.default_tenant_id)
    .eq("user_id", parsed.data.userId);

  await supabase
    .from("tenant_user_identities")
    .update({ role: parsed.data.role as UserRole })
    .eq("tenant_id", profile.default_tenant_id)
    .eq("user_id", parsed.data.userId);

  revalidatePath("/dashboard/admin/users");
}

const bulkRowSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "instructor", "student"]).default("student"),
  password: z.string().min(8).optional()
});

export type BulkImportRowResult = {
  line: number;
  email: string;
  status: "created" | "error";
  institutionUserId?: string;
  tempPassword?: string;
  message?: string;
};

export type BulkImportState = {
  results: BulkImportRowResult[];
  createdCount: number;
  errorCount: number;
  truncatedAt: number | null;
  formError?: string;
};

const bulkImportInitialState: BulkImportState = {
  results: [],
  createdCount: 0,
  errorCount: 0,
  truncatedAt: null
};

const MAX_BULK_ROWS = 200;
const MAX_FILE_BYTES = 500 * 1024;

/**
 * Minimal CSV line splitter supporting double-quoted fields (with "" as an escaped quote), which
 * covers the common case of names/notes containing commas when exported from Excel/Sheets.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

function generateTempPassword() {
  return randomBytes(9).toString("base64url");
}

const HEADER_ALIASES: Record<string, keyof z.infer<typeof bulkRowSchema>> = {
  fullname: "fullName",
  full_name: "fullName",
  name: "fullName",
  email: "email",
  role: "role",
  password: "password"
};

export async function bulkImportUsersAction(_prevState: BulkImportState, formData: FormData): Promise<BulkImportState> {
  const { profile } = await requireProfile(["admin"]);
  const file = formData.get("csvFile");

  if (!(file instanceof File) || file.size === 0) {
    return { ...bulkImportInitialState, formError: "Choose a CSV file to import." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { ...bulkImportInitialState, formError: "CSV file is too large (max 500 KB)." };
  }

  const text = await file.text();
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { ...bulkImportInitialState, formError: "CSV file is empty." };
  }

  // Detect a header row by checking whether its cells match known column names; otherwise assume
  // the default column order (fullName, email, role, password) and treat every line as data.
  const firstRowCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = firstRowCells.some((cell) => cell in HEADER_ALIASES);
  const columnOrder: Array<keyof z.infer<typeof bulkRowSchema> | null> = hasHeader
    ? firstRowCells.map((cell) => HEADER_ALIASES[cell] ?? null)
    : ["fullName", "email", "role", "password"];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const truncated = dataLines.length > MAX_BULK_ROWS;
  const rowsToProcess = dataLines.slice(0, MAX_BULK_ROWS);

  const admin = createSupabaseAdminClient();
  const results: BulkImportRowResult[] = [];
  let createdCount = 0;

  for (let index = 0; index < rowsToProcess.length; index += 1) {
    const lineNumber = index + (hasHeader ? 2 : 1);
    const cells = parseCsvLine(rowsToProcess[index]);
    const rawRow: Record<string, string> = {};
    columnOrder.forEach((key, cellIndex) => {
      if (key) {
        rawRow[key] = cells[cellIndex] ?? "";
      }
    });

    const parsed = bulkRowSchema.safeParse({
      fullName: rawRow.fullName,
      email: rawRow.email,
      role: rawRow.role || "student",
      password: rawRow.password || undefined
    });

    if (!parsed.success) {
      results.push({
        line: lineNumber,
        email: rawRow.email || "(missing)",
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Invalid row."
      });
      continue;
    }

    const passwordGenerated = !parsed.data.password;
    const password = parsed.data.password ?? generateTempPassword();
    const result = await createInstitutionUser(admin, {
      tenantId: profile.default_tenant_id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      password,
      role: parsed.data.role
    });

    if (result.ok) {
      createdCount += 1;
      results.push({
        line: lineNumber,
        email: parsed.data.email,
        status: "created",
        institutionUserId: result.institutionUserId,
        tempPassword: passwordGenerated ? password : undefined
      });
    } else {
      results.push({
        line: lineNumber,
        email: parsed.data.email,
        status: "error",
        message: result.message
      });
    }
  }

  if (createdCount > 0) {
    revalidatePath("/dashboard/admin/users");
  }

  return {
    results,
    createdCount,
    errorCount: results.length - createdCount,
    truncatedAt: truncated ? MAX_BULK_ROWS : null
  };
}
