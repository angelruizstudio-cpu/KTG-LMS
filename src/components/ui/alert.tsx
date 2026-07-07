import * as React from "react";

import { cn } from "@/lib/utils";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "error" | "success" | "info";
};

const variantStyles: Record<NonNullable<AlertProps["variant"]>, string> = {
  error: "border-error bg-error-light text-error-hover",
  success: "border-success bg-success-light text-success-strong",
  info: "border-secondary bg-secondary-light text-secondary-hover"
};

/**
 * Consistent inline banner for form feedback. Uses the AA-contrast "strong/hover" text tokens
 * rather than the light base colors, which failed contrast on the tinted backgrounds.
 */
export function Alert({ variant = "info", className, children, ...props }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-3 py-2 text-sm", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
