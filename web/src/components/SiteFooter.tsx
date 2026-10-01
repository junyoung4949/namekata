import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

export function SiteFooter() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-4xl mx-auto px-5 py-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <Logo className="h-4 w-auto shrink-0" />
        <span>{t("tagline")}</span>
        <div className="ml-auto flex gap-5">
          <Link href="/license" className="hover:text-text underline underline-offset-4">
            {t("license")}
          </Link>
          <Link href="/takedown" className="hover:text-text underline underline-offset-4">
            {t("takedown")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
