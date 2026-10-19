"use client";

import { useRef, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { Prose } from "./Prose";
import { Attribution } from "./Attribution";
import { isValidIdentifier } from "@/lib/scoring";
import type { PracticeQuestion } from "@/lib/guides";
import type { Highlighted } from "@/lib/highlight";
import type { SubmissionResult } from "@/lib/types";

/**
 * 장 끝에 붙는 연습 한 문제. 좌우 두 칸이다.
 *
 * 왼쪽이 "이 함수가 하는 일", 오른쪽이 코드와 답. 세로로 쌓으면 설명을
 * 읽고 코드를 보려고 스크롤하고, 답을 쓰다가 설명을 다시 보려고 또 올라가야
 * 한다. 나란히 두면 둘을 번갈아 볼 수 있다. 좁은 화면에서는 어쩔 수 없이
 * 쌓는다.
 *
 * 상황 설명을 가리지 않는 것이 이 화면의 전제다. 연습 대상은 코드 독해가
 * 아니라 네이밍이므로, 무슨 일을 하는 함수인지는 처음부터 알려준다.
 */
export function PracticePanel({
  question,
  highlighted,
}: {
  question: PracticeQuestion;
  highlighted: Highlighted;
}) {
  const [name, setName] = useState("");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    if (!isValidIdentifier(trimmed)) {
      setError("식별자로 쓸 수 없는 이름입니다.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: question.id, name: trimmed }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult((await res.json()) as SubmissionResult);
    } catch {
      setError("제출하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setResult(null);
    setName("");
    setError(null);
    input.current?.focus();
  }

  return (
    <div className="practice">
      <div className="practice-head">
        <span className="practice-tag">연습</span>
        <span className="practice-lang">{LANGUAGE[question.language]}</span>
        {/* 자작 문제에는 저장소가 없다. 그때는 감싸는 이름만 적는다. */}
        <span className="practice-from mono">
          {[question.source?.repo, question.owner].filter(Boolean).join(" · ")}
        </span>
      </div>

      <div className="practice-cols">
        <div className="practice-brief">
          {question.brief ? (
            <>
              <p className="practice-brief-h">이 함수가 하는 일</p>
              <Prose>{question.brief}</Prose>
            </>
          ) : (
            <p className="text-sm text-muted">상황 설명이 아직 없습니다.</p>
          )}
        </div>

        <div className="practice-work">
          <CodeBlock
            highlighted={highlighted}
            placeholder={question.placeholder}
            slotLength={question.answerLength}
            reveal={result?.answer}
            input={
              result
                ? undefined
                : {
                    value: name,
                    onChange: setName,
                    inputRef: input,
                    label: "이름",
                  }
            }
          />

          {!result && (
            <div className="practice-send">
              <button type="button" onClick={submit} disabled={!name.trim() || busy}>
                {busy ? "보내는 중" : "확인"}
              </button>
              <span className="practice-hint">원본은 {question.answerLength}글자입니다.</span>
            </div>
          )}

          {error && <p className="practice-error">{error}</p>}

          {result && <Result result={result} onRetry={retry} />}

          <Attribution source={question.source} />
        </div>
      </div>
    </div>
  );
}

/**
 * 맞고 틀림을 가리지 않는다.
 *
 * 원본을 보여주고 어떤 단어가 겹쳤는지만 표시한다 — 이름에는 정답이 하나가
 * 아니라는 게 이 사이트의 입장이다. 글자까지 같았을 때만 한마디 덧붙인다.
 */
function Result({ result, onRetry }: { result: SubmissionResult; onRetry: () => void }) {
  const hit = new Set(result.matchedWords.map((word) => word.toLowerCase()));

  return (
    <section className="practice-result">
      <div className="practice-words">
        <span className="practice-words-k">내 답</span>
        <Words words={result.submittedWords} hit={hit} />
      </div>
      <div className="practice-words">
        <span className="practice-words-k">원본</span>
        <Words words={result.answerWords} hit={hit} />
      </div>

      <p className="practice-tally">
        겹친 단어 <b>{result.matchedWords.length}</b> / {result.answerWords.length}
        {result.exact && " · 원본과 완전히 같습니다"}
      </p>

      {result.rationale && (
        <div className="practice-why">
          <p className="practice-why-h">왜 이 이름인가</p>
          <Prose>{result.rationale}</Prose>
        </div>
      )}

      {result.references.length > 0 && (
        <div className="practice-refs">
          {result.references.map((ref) => (
            <a
              key={`${ref.guideSlug}/${ref.chapterSlug}`}
              href={`/guide/${ref.guideSlug}#${ref.chapterSlug}`}
            >
              {ref.title}
            </a>
          ))}
        </div>
      )}

      <button type="button" className="practice-again" onClick={onRetry}>
        다시 해보기
      </button>
    </section>
  );
}

function Words({ words, hit }: { words: string[]; hit: Set<string> }) {
  if (words.length === 0) return <span className="practice-word">—</span>;
  return (
    <span className="practice-wordlist">
      {words.map((word, index) => (
        <span
          key={index}
          className={`practice-word${hit.has(word.toLowerCase()) ? " practice-word--hit" : ""}`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

const LANGUAGE: Record<string, string> = {
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
};
