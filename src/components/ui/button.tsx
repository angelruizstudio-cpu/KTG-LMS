import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-primary text-text-inverse shadow-glow hover:bg-primary-hover focus-visible:outline-primary",
        variant === "secondary" && "border border-border bg-surface text-text-primary shadow-sm hover:border-secondary hover:bg-secondary-light",
        variant === "ghost" && "text-text-secondary hover:bg-secondary-light hover:text-text-primary",
        variant === "danger" && "bg-error text-text-inverse shadow-sm hover:bg-error-hover focus-visible:outline-error",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className
      )}
      {...props}
    />
  );
}
