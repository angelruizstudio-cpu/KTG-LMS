import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { requiredEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, requiredEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const courseId = session.metadata?.course_id;
    const studentId = session.metadata?.student_id;

    if (courseId && studentId) {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.from("enrollments").upsert(
        {
          course_id: courseId,
          student_id: studentId,
          status: "active"
        },
        { onConflict: "course_id,student_id" }
      );

      if (error) {
        console.error("Stripe webhook: failed to upsert enrollment", error);
        return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
