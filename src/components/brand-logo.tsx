import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  markClassName,
  imageClassName,
  showText = true,
  inverse = false
}: {
  className?: string;
  markClassName?: string;
  imageClassName?: string;
  showText?: boolean;
  inverse?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className={cn("grid size-11 place-items-center overflow-hidden rounded-2xl bg-surface shadow-glow", markClassName)}>
        <Image
          alt="Dosis de Esperanza Educa"
          className={cn("h-10 w-10 object-contain", imageClassName)}
          height={80}
          priority
          src="/brand/dosis-educa.png"
          width={80}
        />
      </span>
      {showText ? (
        <span className="leading-tight">
          <span className={cn("block text-sm font-bold", inverse ? "text-text-inverse" : "text-text-primary")}>
            Dosis Educa
          </span>
          <span className={cn("block text-xs font-medium", inverse ? "text-text-inverse opacity-70" : "text-text-secondary")}>
            Dosis de Esperanza
          </span>
        </span>
      ) : null}
    </span>
  );
}
