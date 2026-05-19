import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ institutions: [] });
  }

  const supabase = createSupabaseAdminClient();
  const safeQuery = query.replace(/[%_]/g, "");
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
