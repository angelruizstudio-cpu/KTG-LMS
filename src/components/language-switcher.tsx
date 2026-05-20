import { setLanguageAction } from "@/app/language-actions";
import { languages, type AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
            <span aria-hidden="true" className="text-base leading-none">
              {languages[item].flag}
            </span>
          </button>
        </form>
      ))}
    </div>
  );
}
