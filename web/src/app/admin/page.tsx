import Link from "next/link";
import { listGuides } from "@/lib/admin";
import { languageLabel } from "@/lib/guides";
import { NewGuideForm } from "@/components/admin/NewGuideForm";

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
        <NewGuideForm />
      </section>
    </div>
  );
}
