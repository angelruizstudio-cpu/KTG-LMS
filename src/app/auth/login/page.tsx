import Link from "next/link";

import { loginAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; institutionName?: string; institutionUserId?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="premium-panel w-full max-w-md rounded-3xl border border-border p-8 shadow-soft">
        <Link className="mb-8 flex items-center gap-3 font-semibold text-text-primary" href="/">
          <BrandLogo />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {params.institutionName ? `${params.institutionName} login` : "Institution login"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">Use the ID issued by your institution to continue.</p>
        </div>
        {params.error ? (
          <div className="mt-5 rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error">
            {params.error}
          </div>
        ) : null}
        <form action={loginAction} className="mt-6 grid gap-4">
          <input name="next" type="hidden" value={params.next ?? "/dashboard"} />
          <Input
            label="Institution ID"
            name="institutionUserId"
            placeholder="DOSIS-000001"
            autoCapitalize="characters"
            autoComplete="username"
            defaultValue={params.institutionUserId ?? ""}
            required
          />
          <Input label="Password" name="password" type="password" autoComplete="current-password" required />
          <Button type="submit" className="mt-2">
            Log in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-text-secondary">Need access? Contact your institution administrator.</p>
        <p className="mt-3 text-center text-sm">
          <Link className="font-semibold text-primary-hover" href="/platform/login">
            Platform administrator login
          </Link>
        </p>
      </div>
    </main>
  );
}
