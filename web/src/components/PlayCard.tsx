"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CodeBlock } from "./CodeBlock";
import { Attribution } from "./Attribution";
import { ResultPanel } from "./ResultPanel";
import { buildCommentBlock } from "@/lib/comment";
import { isValidIdentifier } from "@/lib/scoring";
import { rate as toPercent } from "@/lib/level";
import type { Highlighted } from "@/lib/highlight";
import type { Level, PublicQuestion, QuestionStats, SubmissionResult } from "@/lib/types";

export function PlayCard({
  question,
  level,
  stats,
  highlighted,
  listHref,
  nextHref,
}: {
  question: PublicQuestion;
  level: Level;
  stats: QuestionStats;
  highlighted: Highlighted;
  /** 고른 조건을 살린 목록 주소. */
  listHref: string;
  /** 같은 조건·정렬에서 바로 다음 문제. 마지막이면 null. */
  nextHref: string | null;
}) {
  const t = useTranslations("play");
  const tl = useTranslations("language");

  // 목록은 단어 겹침률을 쓰고, 여기서는 원본과 글자까지 같았던 비율을
  // 보여준다. 문제를 열어 본 사람에게만 필요한 더 엄한 숫자다.
  const exactRate = toPercent(stats.exact, stats.total);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState<string | null>(null);
  const [commentUsed, setCommentUsed] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  /** 답을 보고 넘어간 경우. 결과 화면에서 "지은 이름" 칸을 뺀다. */
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 열어본 주석은 코드 안, 원래 있던 자리에 끼워 넣는다.
  const commentBlock = useMemo(
    () =>
      comment
        ? buildCommentBlock(
            question.maskedCode,
            question.language,
            comment,
            highlighted.indentUnit,
          )
        : null,
    [comment, question.maskedCode, question.language, highlighted.indentUnit],
  );

  // 첫 빈칸에 커서를 두되 화면은 움직이지 않는다.
  // autoFocus를 쓰면 빈칸이 아래쪽에 있는 문제에서 거기로 스크롤된 채 열린다.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // 커서가 있는 빈칸은 늘 보이게 둔다.
  //
  // 좁은 화면에서는 긴 줄이 코드 블록 밖으로 나가 빈칸이 처음부터 잘려
  // 있을 수 있고, 긴 이름을 치면 커서가 오른쪽으로 밀려난다. 세로로는
  // 움직이지 않고 코드 블록만 가로로 민다 (화면이 튀지 않게).
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement) keepVisible(active);
  }, [name]);

  async function showComment() {
    setCommentUsed(true);
    const res = await fetch(
      `/api/submissions?questionId=${encodeURIComponent(question.id)}&comment=1`,
    );
    const data = (await res.json()) as { docstring: string | null };
    setComment(data.docstring ?? "");
  }

  /**
   * 답을 보고 넘어간다.
   *
   * 제출이 아니므로 아무것도 저장되지 않는다. 원본 이름과 다른 사람들의
   * 답만 받아 결과 화면과 같은 자리에 보여준다.
   */
  async function showAnswer() {
    setPending(true);
    try {
      const res = await fetch(
        `/api/submissions?questionId=${encodeURIComponent(question.id)}&answer=1`,
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Pick<
        SubmissionResult,
        "answer" | "answerWords" | "others"
      >;
      setRevealed(true);
      setResult({
        ...data,
        submittedWords: [],
        matchedWords: [],
        exact: false,
        docstring: null,
      });
    } catch {
      setError(t("invalid"));
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!isValidIdentifier(trimmed)) {
      setError(t("invalid"));
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: question.id, name: trimmed, commentUsed, peeked }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult((await res.json()) as SubmissionResult);
    } catch {
      setError(t("invalid"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="mono px-2 py-0.5 rounded-full border border-accent text-accent">
          lv{level}
        </span>
        <span className="px-2 py-0.5 rounded-full border border-border">
          {tl(question.language)}
        </span>
        <span className="px-2 py-0.5 rounded-full border border-border">
          {t(`kind.${question.kind}`)}
        </span>
        {exactRate !== null && (
          <span className="tabular-nums" title={t("exactRateHint", { count: stats.total })}>
            {t("exactRate", { percent: exactRate })}
          </span>
        )}
        <Link href={listHref} className="ml-auto underline underline-offset-4 hover:text-text">
          {t("backToList")}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold">{t("heading")}</h1>
        <p className="text-sm text-muted mt-1">{t("instruction")}</p>
      </div>

      {/* 제출은 코드 밖에 둔다. 이름은 코드 안 빈칸에 직접 친다. */}
      <form onSubmit={submit} className="space-y-3">
        <CodeBlock
          highlighted={highlighted}
          placeholder={question.placeholder}
          slotLength={question.answerLength}
          reveal={result?.answer}
          comment={commentBlock}
          path={question.source.filePath}
          owner={question.owner}
          input={
            result
              ? undefined
              : { value: name, onChange: setName, inputRef, label: t("inputLabel") }
          }
        />

        {!result && (
          <>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                {t("submit")}
              </button>
              <button
                type="button"
                onClick={showAnswer}
                disabled={pending}
                className="rounded-md border border-border px-4 py-2 font-medium text-muted hover:border-accent hover:text-text disabled:opacity-50"
              >
                {t("revealShow")}
              </button>
              {error && <p className="text-sm text-accent">{error}</p>}
            </div>

            {question.hasComment && (
              <div className="pt-1">
                {comment === null ? (
                  <button
                    type="button"
                    onClick={showComment}
                    className="text-sm text-muted underline underline-offset-4 hover:text-text"
                  >
                    {t("commentShow")} · {t("commentPenalty")}
                  </button>
                ) : (
                  <p className="text-sm text-muted">{t("commentUsed")}</p>
                )}
              </div>
            )}
          </>
        )}
      </form>

      {result && (
        <ResultPanel
          questionId={question.id}
          submitted={revealed ? null : name.trim()}
          result={result}
          nextHref={nextHref}
          listHref={listHref}
        />
      )}

      <Attribution source={question.source} onRevealAttempt={() => setPeeked(true)} />
    </div>
  );
}

/** 빈칸이 코드 블록 오른쪽 밖으로 나가 있으면 그만큼만 가로로 민다. */
function keepVisible(input: HTMLInputElement) {
  const block = input.closest("pre");
  if (!block) return;

  const overflow = input.getBoundingClientRect().right - block.getBoundingClientRect().right;
  if (overflow > 0) block.scrollLeft += overflow + PEEK;
}

/** 빈칸 오른쪽에 남겨 둘 여백 (px). 뒤따르는 코드가 조금은 보여야 한다. */
const PEEK = 24;
