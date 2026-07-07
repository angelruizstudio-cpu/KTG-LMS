import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ institutions: [] });
  }

  const supabase = createSupabaseAdminClient();
  // Whitelist to letters/numbers/spaces/hyphens. This removes the commas, dots and parentheses
  // that could otherwise inject extra clauses into the PostgREST .or() expression below, as well
  // as the ilike wildcards (see security finding M3).
  const safeQuery = query.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 60);

  if (safeQuery.length < 2) {
    return NextResponse.json({ institutions: [] });
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("name,slug,code")
    .eq("status", "active")
    .or(`name.ilike.%${safeQuery}%,slug.ilike.%${safeQuery}%,code.ilike.%${safeQuery}%`)
    .order("name")
    .limit(8);

  if (error) {
    return NextResponse.json({ institutions: [] }, { status: 500 });
  }

  return NextResponse.json({ institutions: data ?? [] });
}
