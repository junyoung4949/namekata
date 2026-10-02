import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { takedownContact } from "@/lib/contact";
import { Logo } from "./Logo";

export function SiteFooter() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-4xl mx-auto px-5 py-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <Logo className="h-4 w-auto shrink-0" />
        <span>{t("tagline")}</span>
        <div className="ml-auto flex flex-wrap gap-5">
          <Link href="/license" className="hover:text-text underline underline-offset-4">
            {t("license")}
          </Link>
          <Link href="/takedown" className="hover:text-text underline underline-offset-4">
            {t("takedown")}
          </Link>
          {/* 저작권자가 바로 연락할 수 있어야 해서 주소를 그대로 적는다. */}
          <a
            href={`mailto:${takedownContact()}`}
            className="hover:text-text underline underline-offset-4"
          >
            {takedownContact()}
          </a>
        </div>
      </div>
    </footer>
  );
}
