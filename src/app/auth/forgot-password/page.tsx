import Link from "next/link";

import { requestPasswordResetAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ accountType?: string; error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const defaultAccountType = params.accountType === "platform" ? "platform" : "institution";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-2xl rounded-3xl border border-border p-8 shadow-soft">
        <Link className="mb-8 flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reset password</h1>
          <p className="mt-2 text-sm text-text-secondary">
            We will send a secure recovery link to the email connected to the account.
          </p>
        </div>

        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}
        {params.sent ? (
          <div className="mt-5 rounded-xl border border-success bg-success-light px-3 py-2 text-sm text-success">
            If the account exists, a password reset email has been sent.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <form action={requestPasswordResetAction} className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
            <input name="accountType" type="hidden" value="institution" />
            <div>
              <h2 className="font-semibold text-text-primary">Institution users</h2>
              <p className="mt-1 text-sm text-text-secondary">Students, instructors, and institution admins use their institution ID.</p>
            </div>
            <Input
              autoCapitalize="characters"
              autoComplete="username"
              defaultValue={defaultAccountType === "institution" ? "" : undefined}
              label="Institution ID"
              name="institutionUserId"
              placeholder="DOSIS-000001"
              required
            />
            <Button type="submit">Send reset link</Button>
          </form>

          <form action={requestPasswordResetAction} className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
            <input name="accountType" type="hidden" value="platform" />
            <div>
              <h2 className="font-semibold text-text-primary">Platform administrators</h2>
              <p className="mt-1 text-sm text-text-secondary">Platform admins use the email assigned to their platform account.</p>
            </div>
            <Input label="Email" name="email" type="email" autoComplete="email" placeholder="admin@example.com" required />
            <Button type="submit" variant="secondary">
              Send reset link
            </Button>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          <Link className="font-semibold text-primary-hover" href="/auth/login">
            Back to institution login
          </Link>
          <Link className="font-semibold text-primary-hover" href="/platform/login">
            Back to platform login
          </Link>
        </div>
      </div>
    </main>
  );
}
