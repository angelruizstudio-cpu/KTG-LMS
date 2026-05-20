"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { languageCookieName, type AppLanguage } from "@/lib/i18n";

export async function setLanguageAction(formData: FormData) {
  const language = String(formData.get("language")) === "en" ? "en" : ("es" as AppLanguage);
  const returnTo = String(formData.get("returnTo") || "/");
  const cookieStore = await cookies();

  cookieStore.set(languageCookieName, language, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax"
  });

  redirect(returnTo.startsWith("/") ? returnTo : "/");
}
