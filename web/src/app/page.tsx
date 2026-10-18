import Link from "next/link";
import { languageLabel, listGuides } from "@/lib/guides";

export const dynamic = "force-dynamic";

/**
 * 홈. 가이드 목록이다.
 *
 * 전에는 문제 목록이었다 — 레벨·언어·종류 드롭다운으로 거르고 정렬해서
 * 고르는 화면. 문제를 고르는 주체가 사용자에서 가이드 저자로 넘어가면서
 * 필터도 정렬도 쓸 자리가 없어졌다.
 */
export default async function HomePage() {
  const guides = await listGuides();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">이름 짓는 법</h1>
        <p className="text-muted max-w-2xl">
          널리 쓰이는 네이밍 규칙을 장별로 읽고, 실제 오픈소스 코드로 확인합니다.
        </p>
      </header>

      {guides.length === 0 ? (
        <p className="text-muted">아직 공개된 가이드가 없습니다.</p>
      ) : (
        <ul className="grid gap-3">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guide/${guide.slug}`}
                className="block rounded-lg border border-border bg-surface px-5 py-4 hover:border-accent"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">
                    {languageLabel(guide.language)}
                  </span>
                  <h2 className="font-medium">{guide.title}</h2>
                </div>
                {guide.lede && <p className="mt-1.5 text-sm text-muted">{guide.lede}</p>}
                {/* 출처는 라이선스 의무다. 번역이 아닌 자작 가이드면 비어 있다. */}
                {guide.source?.title && (
                  <p className="mt-2 text-xs text-muted">
                    {guide.source.title}
                    {guide.source.license ? ` · ${guide.source.license}` : ""} · 한국어 번역
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
