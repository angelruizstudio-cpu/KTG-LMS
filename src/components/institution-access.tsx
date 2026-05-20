"use client";

import { ArrowRight, Building2, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Institution = {
  code: string;
  name: string;
  slug: string;
};

export function InstitutionAccess() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const openSearch = () => setIsSearchOpen(true);

    window.addEventListener("openInstitutionSearch", openSearch);

    return () => window.removeEventListener("openInstitutionSearch", openSearch);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!isSearchOpen || trimmedQuery.length < 2) {
      setInstitutions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/institutions/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal
        });
        const payload = (await response.json()) as { institutions?: Institution[] };
        setInstitutions(payload.institutions ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setInstitutions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isSearchOpen, query]);

  return (
    <div className="grid gap-5 lg:ml-auto lg:w-[560px]">
      {isSearchOpen ? (
        <aside className="rounded-[2rem] border border-white/20 bg-secondary p-7 text-text-inverse shadow-blueglow sm:p-9">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-secondary-hover">
              <Building2 size={24} />
            </span>
            <div>
              <h2 className="text-3xl font-black leading-tight text-text-inverse">Students and Educators</h2>
              <p className="mt-4 text-base font-medium leading-7 text-text-inverse/90">
                Search for your school and select it to access that institution&apos;s login page.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3">
            <label className="text-sm font-bold text-text-inverse" htmlFor="institutionSearch">
              Search School/District
            </label>
            <input
              autoFocus
              className="h-14 rounded-xl border border-white/20 bg-surface px-4 text-base font-semibold text-text-primary outline-none shadow-soft transition placeholder:text-text-secondary/70 focus:border-accent focus:ring-4 focus:ring-accent/30"
              id="institutionSearch"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search institution"
              value={query}
            />

            <div className="mt-2 grid gap-3">
              {isLoading ? (
                <div className="rounded-xl bg-surface px-4 py-4 text-sm font-semibold text-text-secondary">Searching...</div>
              ) : null}

              {!isLoading && query.trim().length >= 2 && institutions.length === 0 ? (
                <div className="rounded-xl bg-surface px-4 py-4 text-sm font-semibold text-text-secondary">
                  No matching institutions found.
                </div>
              ) : null}

              {institutions.map((institution) => (
                <Link
                  className="group flex items-center justify-between rounded-xl bg-surface px-5 py-4 text-base font-bold text-secondary-hover shadow-soft transition hover:bg-secondary-light hover:text-text-primary"
                  href={`/auth/login?institution=${encodeURIComponent(institution.slug)}&institutionName=${encodeURIComponent(
                    institution.name
                  )}`}
                  key={institution.slug}
                >
                  <span>{institution.name}</span>
                  <span className="font-mono text-sm text-text-secondary transition group-hover:text-text-primary">{institution.code}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      ) : (
        <div className="rounded-[2rem] border border-white/45 bg-white/10 p-4 shadow-glow backdrop-blur">
          <div className="rounded-3xl bg-surface p-5 text-text-primary shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-text-secondary">Student Portal</p>
                <h2 className="mt-1 text-2xl font-black text-text-primary">Program Dashboard</h2>
              </div>
              <span className="rounded-full bg-success-light px-3 py-1 text-sm font-bold text-success">Live</span>
            </div>
            <div className="mt-6 grid gap-3">
              {["Program courses", "Prerequisite access", "Finance clearance"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary-light text-sm font-black text-primary-hover">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-text-primary">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["ID", "Login"],
              ["RLS", "Secure"],
              ["100%", "Tenant"]
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-surface p-4 text-center shadow-soft">
                <p className="text-2xl font-black text-text-primary">{value}</p>
                <p className="mt-1 text-xs font-bold uppercase text-text-secondary">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OpenInstitutionSearchButton() {
  return (
    <button
      className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-text-inverse shadow-glow transition hover:bg-primary-hover"
      onClick={() => window.dispatchEvent(new Event("openInstitutionSearch"))}
      type="button"
    >
      <GraduationCap size={20} />
      Students and Educators
      <ArrowRight size={18} />
    </button>
  );
}
