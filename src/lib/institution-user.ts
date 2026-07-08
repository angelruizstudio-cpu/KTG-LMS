import type { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

type NewInstitutionUser = {
  tenantId: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};

/**
 * Create one institution user end-to-end: auth account, profile, tenant membership, and an issued
 * institution ID. Shared by the admin single-user form, the CSV bulk-import action, and the
 * registrar's "create student" action so the 5-step sequence only lives in one place.
 */
export async function createInstitutionUser(
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
