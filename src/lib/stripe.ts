import Stripe from "stripe";

import { requiredEnv } from "@/lib/env";

export function getStripe() {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-02-24.acacia",
    typescript: true
  });
}
