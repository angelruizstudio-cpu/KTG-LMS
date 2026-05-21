import { setLanguageAction } from "@/app/language-actions";
import { languages, type AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function FlagIcon({ language }: { language: AppLanguage }) {
  if (language === "es") {
    return (
      <span aria-hidden="true" className="relative block h-4 w-6 overflow-hidden rounded-[3px] border border-white/40 shadow-sm">
        <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,#d11f3f_0_20%,#fff_20%_40%)]" />
        <span className="absolute left-0 top-0 h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-[#0050a4]" />
        <span className="absolute left-[3px] top-[5px] text-[7px] leading-none text-white">★</span>
      </span>
    );
  }

  if (language === "zh") {
    return (
      <span aria-hidden="true" className="relative block h-4 w-6 overflow-hidden rounded-[3px] border border-white/40 bg-[#de2910] shadow-sm">
        <span className="absolute left-[3px] top-[2px] text-[8px] leading-none text-[#ffde00]">★</span>
        <span className="absolute left-[11px] top-[2px] size-1 rounded-full bg-[#ffde00]" />
        <span className="absolute left-[14px] top-[5px] size-1 rounded-full bg-[#ffde00]" />
        <span className="absolute left-[13px] top-[9px] size-1 rounded-full bg-[#ffde00]" />
        <span className="absolute left-[10px] top-[12px] size-1 rounded-full bg-[#ffde00]" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="relative block h-4 w-6 overflow-hidden rounded-[3px] border border-white/40 shadow-sm">
      <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,#b22234_0_8%,#fff_8%_16%)]" />
      <span className="absolute left-0 top-0 h-[9px] w-[11px] bg-[#3c3b6e]" />
      <span className="absolute left-[2px] top-[1px] text-[5px] leading-none tracking-[1px] text-white">••</span>
      <span className="absolute left-[2px] top-[4px] text-[5px] leading-none tracking-[1px] text-white">••</span>
    </span>
  );
}

export function LanguageSwitcher({
  currentPath = "/",
  language,
  variant = "light"
}: {
  currentPath?: string;
  language: AppLanguage;
  variant?: "dark" | "light";
}) {
  return (
    <div
      aria-label={language === "es" ? "Cambiar idioma" : "Change language"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border p-1 shadow-sm",
        variant === "dark" ? "border-white/20 bg-white/10" : "border-border bg-surface"
      )}
    >
      {(Object.keys(languages) as AppLanguage[]).map((item) => (
        <form action={setLanguageAction} key={item}>
          <input name="language" type="hidden" value={item} />
          <input name="returnTo" type="hidden" value={currentPath} />
          <button
            aria-pressed={language === item}
            aria-label={languages[item].label}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full text-lg font-bold leading-none transition",
              language === item
                ? "bg-primary text-text-inverse shadow-glow"
                : variant === "dark"
                  ? "text-text-inverse/80 hover:bg-white/10 hover:text-text-inverse"
                  : "text-text-secondary hover:bg-primary-light hover:text-primary-hover"
            )}
            title={languages[item].label}
            type="submit"
          >
            <FlagIcon language={item} />
          </button>
        </form>
      ))}
    </div>
  );
}
