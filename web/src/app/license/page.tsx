import Link from "next/link";
import { requireAttribution } from "@/lib/attribution";
import { listQuestions } from "@/lib/questions";
import { languageLabel, listGuides } from "@/lib/guides";

export const dynamic = "force-dynamic";

/**
 * 라이선스 고지.
 *
 * 싣는 것이 두 가지라 출처도 두 묶음이다.
 *
 * - **문제 코드** — 허용적 라이선스(MIT·BSD·Apache 2.0)의 오픈소스에서
 *   가져오고, 식별자를 가려 수정한다
 * - **가이드 본문** — 공개된 스타일가이드를 번역해 싣는다. 구글 스타일가이드는
 *   CC-BY 3.0 이라 저작자 표시와 **개작(번역) 사실 명시**를 함께 요구한다
 *
 * 둘 다 손으로 적은 목록이 아니라 실제 데이터에서 모은다. 적어 두고 잊으면
 * 어긋나는데, 이 페이지가 어긋나면 지키지 못한 것이 된다.
 */
export default async function LicensePage() {
  const [questions, guides] = await Promise.all([listQuestions(), listGuides()]);

  const repos = new Map<
    string,
    { repo: string; repoUrl: string; license: string; copyright: string | null; count: number }
  >();
  for (const question of questions) {
    // 사람이 쓴 문제에는 표기할 원문이 없다. 고지할 것이 없으므로 건너뛴다.
    if (!question.source) continue;
    // 이 페이지가 바로 라이선스 고지다. 칸이 빠지면 조용히 넘어가지 않는다.
    const source = requireAttribution(question.source);
    const entry = repos.get(source.repo);
    if (entry) {
      entry.count += 1;
    } else {
      repos.set(source.repo, {
        repo: source.repo,
        repoUrl: source.repoUrl,
        license: source.license,
        copyright: source.copyrightHolder,
        count: 1,
      });
    }
  }

  // 번역해 실은 가이드만. 자작 가이드는 표기할 원문이 없다.
  const translated = guides.filter((guide) => guide.source?.url);

  return (
    <article className="page space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">라이선스와 출처</h1>
        <p className="text-muted max-w-2xl">
          namekata는 두 가지를 가져다 씁니다. <strong>문제</strong>는 허용적 라이선스로 공개된
          오픈소스 코드에서 가져오고, <strong>가이드 본문</strong>은 공개된 스타일가이드를
          번역한 것입니다. 어느 쪽이든 출처와 라이선스, 그리고 원본을 고친 사실을 함께
          표시합니다.
        </p>
      </header>

      <Section title="수정 사실">
        <p className="text-muted max-w-2xl">
          문제로 쓰기 위해 원본 코드에서 식별자 이름을 가리고 주석과 설명 문자열을
          제거했습니다. 표시된 코드는 원본 그대로가 아닙니다.
        </p>
        <p className="text-muted max-w-2xl">
          가이드 본문은 원문을 한국어로 <strong>번역</strong>한 것입니다. 번역은 개작에
          해당하며, 원문의 표현과 다를 수 있습니다. 각 가이드 화면과 아래 목록에 원문으로
          가는 링크를 둡니다.
        </p>
      </Section>

      <Section title="보증 아님">
        <p className="text-muted max-w-2xl">
          여기에 인용된 프로젝트와 문서의 이름은 출처 표시일 뿐이며, 해당 프로젝트나 저작자가
          namekata를 보증하거나 후원한다는 뜻이 아닙니다. 번역의 정확성에 대한 책임도 원
          저작자가 아니라 namekata에 있습니다.
        </p>
      </Section>

      {translated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">번역해 싣는 가이드</h2>
          <ul className="grid gap-2">
            {translated.map((guide) => (
              <li
                key={guide.slug}
                className="rounded-lg border border-border bg-surface px-4 py-3 space-y-1"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/guide/${guide.slug}`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    {guide.title}
                  </Link>
                  <span className="text-xs text-muted">{languageLabel(guide.language)}</span>
                  {guide.source?.license && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">
                      {guide.source.license}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted">한국어 번역</span>
                </div>
                <p className="text-xs text-muted">
                  원문{" "}
                  <a
                    href={guide.source!.url!}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline underline-offset-4 break-all"
                  >
                    {guide.source!.title ?? guide.source!.url}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">문제를 가져온 저장소</h2>
        <ul className="grid gap-2">
          {[...repos.values()]
            .sort((a, b) => b.count - a.count)
            .map((entry) => (
              <li
                key={entry.repo}
                className="rounded-lg border border-border bg-surface px-4 py-3 space-y-1"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={entry.repoUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mono text-sm underline underline-offset-4"
                  >
                    {entry.repo}
                  </a>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">
                    {entry.license}
                  </span>
                  <span className="ml-auto text-xs text-muted">문제 {entry.count}개</span>
                </div>
                {entry.copyright && <p className="text-xs text-muted">{entry.copyright}</p>}
              </li>
            ))}
        </ul>
      </section>

      <p className="text-sm text-muted">
        코드나 번역문의 게시를 원하지 않으시면 삭제 요청 창구로 알려 주세요. 확인 후 즉시
        내리겠습니다.{" "}
        <Link href="/takedown" className="underline underline-offset-4">
          삭제 요청
        </Link>
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}
