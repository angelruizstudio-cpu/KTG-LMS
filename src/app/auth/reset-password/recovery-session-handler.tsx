"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RecoverySessionHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || type !== "recovery") {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      .then(({ error }) => {
        if (error) {
          router.replace(`/auth/reset-password?error=${encodeURIComponent("Recovery link could not be verified. Request a new link.")}`);
          return;
        }

        router.replace(`${window.location.pathname}${window.location.search}`);
        router.refresh();
      });
  }, [router]);

  return null;
}
