import * as React from "react";

import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  /** Accessible name when no visible label is shown (e.g. inline table controls). */
  srLabel?: string;
};

export function Select({ className, label, srLabel, id, children, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  const control = (
    <select
      id={selectId}
      aria-label={!label ? srLabel : undefined}
      className={cn(
        "h-11 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (!label) {
    return control;
  }

  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary" htmlFor={selectId}>
      {label}
      {control}
    </label>
  );
}
