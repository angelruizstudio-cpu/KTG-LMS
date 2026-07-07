import Link from "next/link";

import { cn } from "@/lib/utils";

type PaginationProps = {
  /** Path the page links point at, e.g. "/dashboard/admin/users". */
  basePath: string;
  page: number;
  totalPages: number;
  /** Extra query params to preserve across page changes (e.g. the active search term). */
  params?: Record<string, string | undefined>;
};

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  search.set("page", String(page));
  return `${basePath}?${search.toString()}`;
}

export function Pagination({ basePath, page, totalPages, params = {} }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const linkClass = "rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary-hover";
  const disabledClass = "pointer-events-none opacity-40";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 px-5 py-4">
      <Link
        aria-disabled={page <= 1}
        className={cn(linkClass, page <= 1 && disabledClass)}
        href={buildHref(basePath, params, Math.max(1, page - 1))}
        rel="prev"
      >
        Previous
      </Link>
      <span className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </span>
      <Link
        aria-disabled={page >= totalPages}
        className={cn(linkClass, page >= totalPages && disabledClass)}
        href={buildHref(basePath, params, Math.min(totalPages, page + 1))}
        rel="next"
      >
        Next
      </Link>
    </nav>
  );
}
