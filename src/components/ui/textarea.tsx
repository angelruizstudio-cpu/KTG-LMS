import * as React from "react";

import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ className, label, id, ...props }: TextareaProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary" htmlFor={inputId}>
      {label}
      <textarea
        id={inputId}
        className={cn(
          "min-h-28 rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/60 focus:border-primary focus:ring-4 focus:ring-primary-light",
          className
        )}
        {...props}
      />
    </label>
  );
}
