import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ className, label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={cn(
          "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary-light",
          className
        )}
        {...props}
      />
    </label>
  );
}
