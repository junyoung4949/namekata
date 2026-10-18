import Link from "next/link";
import { listGuides } from "@/lib/admin";
import { languageLabel } from "@/lib/guides";
import { createGuide } from "./actions";

export const dynamic = "force-dynamic";

/**
 * 가이드 목록. 초안까지 전부 보인다.
 *
 * 이 화면으로 가는 링크를 사이트 어디에도 두지 않는다. 방문자에게 보여 줄
 * 이유가 없고, 두면 Next 가 미리 받아 두면서(prefetch) 401 을 받아 브라우저
 * 로그인 창을 띄운다. 주소를 직접 치거나 북마크해서 들어온다.
 */
export default async function AdminPage() {
  const guides = await listGuides();

  return (
    <div className="page space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">가이드</h1>
        <p className="text-muted text-sm">쓰고 고치는 곳입니다. 초안은 사이트에 뜨지 않습니다.</p>
      </header>

      <ul className="grid gap-2">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/admin/${guide.slug}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-accent"
            >
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  guide.status === "published"
                    ? "bg-accent-soft text-accent"
                    : "border border-border text-muted"
                }`}
              >
                {guide.status === "published" ? "공개" : "초안"}
              </span>
              <span className="text-xs text-muted">{languageLabel(guide.language)}</span>
              <span className="font-medium">{guide.title}</span>
              <span className="mono text-xs text-muted ml-auto">{guide.slug}</span>
            </Link>
          </li>
        ))}
        {guides.length === 0 && <li className="text-muted text-sm">아직 없습니다.</li>}
      </ul>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-medium">새 가이드</h2>
        <form action={createGuide} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-muted">주소에 쓸 이름 (slug)</span>
            <input name="slug" required placeholder="google-python-naming" className="admin-input mono" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted">언어</span>
            <select name="language" defaultValue="common" className="admin-input">
              <option value="common">공통</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs text-muted">제목</span>
            <input name="title" required placeholder="구글 파이썬 스타일가이드 · 네이밍" className="admin-input" />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs text-muted">한 줄 소개 (홈 카드에 쓰입니다)</span>
            <input name="lede" className="admin-input" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="admin-button">
              만들기
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
