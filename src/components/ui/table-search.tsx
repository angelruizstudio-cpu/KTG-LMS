import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

type TableSearchProps = {
  /** Path the search submits to (page resets because `page` is not re-sent). */
  action: string;
  placeholder: string;
  defaultValue?: string;
};

/**
 * Plain GET search form for server-rendered tables. Submitting sets ?q= and drops ?page= so the
 * results start from the first page.
 */
export function TableSearch({ action, placeholder, defaultValue }: TableSearchProps) {
  return (
    <form action={action} className="flex items-center gap-2" role="search">
      <label className="relative flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary-light"
          defaultValue={defaultValue}
          name="q"
          placeholder={placeholder}
          type="search"
        />
      </label>
      <Button size="sm" type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
