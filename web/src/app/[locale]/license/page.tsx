import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listAll } from "@/lib/questions";

export default async function LicensePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("license");
  const tc = await getTranslations("common");

  // 출처는 문제 데이터에서 모은다. 손으로 적은 목록이 아니라 실제로 쓰는 저장소다.
  const questions = await listAll();
  const repos = new Map<
    string,
    { repo: string; repoUrl: string; license: string; copyright: string | null; count: number }
  >();
  for (const question of questions) {
    const source = question.source;
    const entry = repos.get(source.repo);
    if (entry) {
      entry.count += 1;
    } else {
      repos.set(source.repo, {
        repo: source.repo,
        repoUrl: source.repo_url,
        license: source.license,
        copyright: source.copyright_holder,
        count: 1,
      });
    }
  }

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted max-w-2xl">{t("intro")}</p>
      </header>

      <Section title={t("modifiedHeading")} body={t("modifiedBody")} />
      <Section title={t("endorsementHeading")} body={t("endorsementBody")} />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("sourcesHeading")}</h2>
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
                    {t("questionCount", { count: entry.count })}
                  </span>
                </div>
                {entry.copyright && <p className="text-xs text-muted">{entry.copyright}</p>}
              </li>
            ))}
        </ul>
      </section>

      <p className="text-sm text-muted">
        {t("takedownNote")}{" "}
        <Link href="/takedown" className="underline underline-offset-4">
          {tc("takedown")}
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
