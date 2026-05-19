import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "blue" | "green" | "amber" | "slate" | "pink";
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "blue" && "bg-secondary-light text-secondary-hover",
        tone === "green" && "bg-success-light text-success",
        tone === "amber" && "bg-warning-light text-warning",
        tone === "pink" && "bg-primary-light text-primary-hover",
        tone === "slate" && "bg-background text-text-secondary",
        className
      )}
      {...props}
    />
  );
}
