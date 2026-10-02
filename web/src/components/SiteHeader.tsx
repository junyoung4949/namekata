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
        {/*
          검수 화면(/admin) 링크는 여기 두지 않는다.

          방문자에게 보여 줄 이유가 없고, 두면 실제로 고장난다 — Next 는 화면에
          보이는 Link 를 미리 받아 두는데(prefetch), 그 요청이 검수 화면을 막는
          401 + WWW-Authenticate 를 받으면 **브라우저가 로그인 창을 띄운다.**
          문제를 풀러 온 사람이 페이지를 열 때마다 아이디·비밀번호를 묻는 창을
          보게 된다.

          관리자는 주소를 직접 치거나 북마크해서 들어간다.
        */}
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-text">
            {t("play")}
          </Link>
        </nav>
        <div className="ml-auto">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
