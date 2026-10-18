import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

/**
 * 한국어만 쓴다.
 *
 * 전에는 next-intl 로 ko·en 두 벌을 돌렸다. 주소에 /ko, /en 접두어가 붙고
 * 문구는 messages/*.json 을 거쳤는데, 언어가 하나면 그 경유가 순수한
 * 간접층이다 — 코드를 읽어도 화면에 무엇이 쓰이는지 보이지 않는다.
 * 가이드 본문까지 DB 로 가면서 메시지 파일에 남을 것이 버튼 라벨 정도라
 * 통째로 걷어냈다.
 */
export const metadata: Metadata = {
  title: "namekata",
  description: "오픈소스 코드로 이름 짓기를 연습합니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        {/* 폭은 페이지가 정한다. 가이드는 화면을 넓게 쓰고, 글 페이지는 좁게 읽힌다. */}
        <main className="flex-1 w-full">{children}</main>
        <SiteFooter />
        {/* NEXT_PUBLIC_GA_ID 가 없으면 아무것도 그리지 않는다. */}
        <Analytics />
      </body>
    </html>
  );
}
