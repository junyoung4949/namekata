"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { analyze } from "@/lib/role";
import type { SubmissionResult } from "@/lib/types";

/**
 * 원본 이름 공개 + 단어 일치 표시 + 다른 사용자 답 목록.
 * 다른 답은 제출한 뒤에만 내려온다 (제출 전에 보이면 베끼게 된다).
 */
export function ResultPanel({
  questionId,
  submitted,
  result,
  nextHref,
  listHref,
}: {
  questionId: string;
  /** 제출한 이름. 답을 보고 넘어갔으면 null (견줄 이름이 없다). */
  submitted: string | null;
  result: SubmissionResult;
  /** 같은 조건·정렬에서 바로 다음 문제. 마지막이면 null 이고, 목록으로 보낸다. */
  nextHref: string | null;
  listHref: string;
}) {
  const t = useTranslations("result");
  const [reported, setReported] = useState<string[]>([]);

  async function report(name: string) {
    setReported((current) => [...current, name]);
    await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId, name }),
    });
  }

  const matched = new Set(result.matchedWords);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-medium text-muted">{t("heading")}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {submitted !== null && (
            <Field label={t("yours")}>
              <WordChips words={result.submittedWords} matched={matched} raw={submitted} />
            </Field>
          )}
          <Field label={t("original")}>
            <WordChips words={result.answerWords} matched={matched} raw={result.answer} />
          </Field>
        </div>

        {submitted === null ? (
          <p className="text-sm">{t("revealed")}</p>
        ) : (
          <p className={result.exact ? "text-match font-medium" : "text-sm"}>
            {result.exact
              ? t("exact")
              : result.matchedWords.length > 0
                ? t("partial", { count: result.matchedWords.length })
                : t("none")}
          </p>
        )}
        <p className="text-xs text-muted">{t("wordNote")}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
        <h2 className="text-sm font-medium text-muted">{t("othersHeading")}</h2>
        {result.others.length === 0 ? (
          <p className="text-sm text-muted">{t("othersEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {result.others.map((other) => (
              <li key={other.name} className="flex items-center gap-3 py-2">
                <RoleName name={other.name} />
                {other.name === submitted && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-accent-soft text-accent">
                    {t("yourAnswerTag")}
                  </span>
                )}
                {other.name === result.answer && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-match-soft text-match">
                    {t("original")}
                  </span>
                )}
                <span className="ml-auto text-sm text-muted">
                  {t("othersCount", { count: other.count })}
                </span>
                <button
                  type="button"
                  disabled={reported.includes(other.name)}
                  onClick={() => report(other.name)}
                  className="text-xs text-muted underline underline-offset-4 hover:text-text disabled:no-underline disabled:opacity-60"
                >
                  {reported.includes(other.name) ? t("reported") : t("report")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 걸러 놓은 목록의 끝에 닿으면 다음이 없다. 그때는 목록으로 보낸다 —
          조건을 몰래 풀고 아무 문제나 주면 왜 그게 나왔는지 알 수 없다. */}
      <Link
        href={nextHref ?? listHref}
        className="inline-block rounded-md bg-accent px-4 py-2 font-medium text-white"
      >
        {nextHref ? t("next") : t("backToList")}
      </Link>
    </section>
  );
}

/**
 * 이름을 역할별로 칠해서 보여준다 (lib/role.ts).
 *
 * 라벨도 범례도 붙이지 않는다. 답을 여러 개 늘어놓고 보다 보면 어디에
 * 불이 켜지는지가 저절로 보이는 것이 이 표시의 전부다.
 */
function RoleName({ name, className }: { name: string; className?: string }) {
  return (
    <span className={className ? `mono ${className}` : "mono"}>
      {analyze(name).map((part, index) => (
        <Fragment key={index}>
          {/* 구분자(_)는 색 밖에 둔다. 칩 배경이 밑줄까지 물면 지저분하다. */}
          {part.before}
          <span className={`role-${part.role}`}>{part.text}</span>
        </Fragment>
      ))}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

function WordChips({
  words,
  matched,
  raw,
}: {
  words: string[];
  matched: Set<string>;
  raw: string;
}) {
  return (
    <div className="space-y-1">
      <RoleName name={raw} className="text-lg" />
      <div className="flex flex-wrap gap-1">
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={
              matched.has(word)
                ? "text-xs px-1.5 py-0.5 rounded bg-match-soft text-match font-medium"
                : "text-xs px-1.5 py-0.5 rounded border border-border text-muted"
            }
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
