import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-md rounded-3xl border border-border p-8 shadow-soft">
        <Link className="mb-8 flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Institution-managed access</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Student, instructor, and institution admin accounts are created by each institution.
          </p>
        </div>
        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}
        <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-text-secondary">
          Your institution will provide an ID like <span className="font-mono font-semibold text-text-primary">DOSIS-000001</span>.
          Use that ID with your password on the institution login page.
        </div>
        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link className="font-semibold text-primary-hover" href="/auth/login">
            Go to institution login
          </Link>
        </p>
      </div>
    </main>
  );
}
