import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";

export function SiteHeader() {
  const t = useTranslations("common");

  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-6">
        <Link href="/" aria-label={t("appName")} className="shrink-0">
          <Logo className="h-5 w-auto text-accent" />
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-text">
            {t("play")}
          </Link>
          <Link href="/admin" className="hover:text-text">
            {t("admin")}
          </Link>
        </nav>
        <div className="ml-auto">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
