import Link from "next/link";
import { requireAttribution } from "@/lib/attribution";
import { listQuestions } from "@/lib/questions";

export default async function LicensePage() {
  // 출처는 문제 데이터에서 모은다. 손으로 적은 목록이 아니라 실제로 쓰는 저장소다.
  const questions = await listQuestions();
  const repos = new Map<
    string,
    { repo: string; repoUrl: string; license: string; copyright: string | null; count: number }
  >();
  for (const question of questions) {
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

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">라이선스와 출처</h1>
        <p className="text-muted max-w-2xl">
          namekata의 문제는 허용적 라이선스로 공개된 오픈소스 코드에서 가져옵니다. MIT, BSD,
          Apache 2.0 코드만 사용하고, 문제마다 저장소·파일·커밋 해시·라이선스·저작권 문구를
          함께 표시합니다.
        </p>
      </header>

      <Section
        title="수정 사실"
        body="문제로 쓰기 위해 원본 코드에서 식별자 이름을 가리고 주석과 설명 문자열을 제거했습니다. 표시된 코드는 원본 그대로가 아닙니다."
      />
      <Section
        title="보증 아님"
        body="여기에 인용된 프로젝트 이름은 출처 표시일 뿐이며, 해당 프로젝트가 namekata를 보증하거나 후원한다는 뜻이 아닙니다."
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">사용 중인 저장소</h2>
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
                  <span className="ml-auto text-xs text-muted">
                    문제 {entry.count}개
                  </span>
                </div>
                {entry.copyright && <p className="text-xs text-muted">{entry.copyright}</p>}
              </li>
            ))}
        </ul>
      </section>

      <p className="text-sm text-muted">
        코드 게시를 원하지 않으시면 삭제 요청 창구로 알려 주세요. 확인 후 즉시 내리겠습니다.{" "}
        <Link href="/takedown" className="underline underline-offset-4">
          삭제 요청
        </Link>
      </p>
    </article>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="space-y-1">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-muted max-w-2xl">{body}</p>
    </section>
  );
}
