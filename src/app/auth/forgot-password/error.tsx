"use client";

import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-xl rounded-3xl border border-border p-8 text-center shadow-soft">
        <div className="mb-8 flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">No pudimos cargar el reset de contraseña</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-secondary">
          La plataforma encontró un problema temporal preparando esta página. Intenta nuevamente o vuelve al login.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Intentar de nuevo
          </Button>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm transition hover:border-secondary hover:bg-secondary-light"
            href="/platform/login"
          >
            Platform login
          </Link>
        </div>
      </div>
    </main>
  );
}
