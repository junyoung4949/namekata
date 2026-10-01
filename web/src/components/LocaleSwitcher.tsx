"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const label = { ko: t("korean"), en: t("english") } as const;

  return (
    <div className="flex items-center gap-1 text-sm">
      {routing.locales.map((next) => (
        <button
          key={next}
          type="button"
          disabled={next === locale}
          onClick={() =>
            // 현재 경로를 유지한 채 언어만 바꾼다. 문제 코드는 공통이고 UI만 바뀐다.
            router.replace(pathname, { locale: next })
          }
          className={
            next === locale
              ? "px-2 py-1 rounded bg-accent-soft text-accent font-medium"
              : "px-2 py-1 rounded text-muted hover:text-text"
          }
        >
          {label[next]}
        </button>
      ))}
    </div>
  );
}
