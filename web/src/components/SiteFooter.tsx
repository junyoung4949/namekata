import Link from "next/link";
import { takedownContact } from "@/lib/contact";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-4xl mx-auto px-5 py-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <Logo className="h-4 w-auto shrink-0" />
        <span>오픈소스 코드로 이름 짓기를 연습합니다</span>
        <div className="ml-auto flex flex-wrap gap-5">
          <Link href="/license" className="hover:text-text underline underline-offset-4">
            라이선스
          </Link>
          <Link href="/takedown" className="hover:text-text underline underline-offset-4">
            삭제 요청
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
