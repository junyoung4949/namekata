"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createChapter,
  detach,
  moveChapter,
  type ActionResult,
} from "@/app/admin/actions";
import { NewQuestionForm } from "./NewQuestionForm";
import { QuestionNote } from "./QuestionNote";
import { ExistingQuestionPicker } from "./ExistingQuestionPicker";
import type { Attached, ChapterRow } from "@/lib/admin";
import { useActionState } from "react";

/**
 * 가이드를 이루는 것들을 한 줄로 늘어놓는다.
 *
 * 장과 문제가 섞인 하나의 목록이다. 글을 쓰는 흐름이 "1장 쓰고 → 문제 하나
 * 만들고 → 2장 쓰고 → 문제 둘 만들고" 이기 때문이다. 장 안으로 들어가야
 * 문제를 붙일 수 있으면 그 흐름이 매번 끊긴다.
 *
 * 장 본문만 따로 화면을 쓴다. 긴 글을 쓰는 자리라 여기 끼워 넣을 수 없다.
 */
type Item =
  | { kind: "chapter"; no: number; chapter: ChapterRow }
  | { kind: "question"; chapter: ChapterRow; question: Attached };

export function GuideOutline({ guide, chapters }: { guide: string; chapters: ChapterRow[] }) {
  const [adding, setAdding] = useState<"chapter" | "question" | "existing" | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const [state, act, pending] = useActionState<ActionResult, FormData>(
    createChapter.bind(null, guide),
    {},
  );

  // 장과 그 장에 붙은 연습 문제를 번갈아 늘어놓는다. 덱에 나오는 순서와 같다.
  const items: Item[] = [];
  chapters.forEach((chapter, index) => {
    items.push({ kind: "chapter", no: index + 1, chapter });
    chapter.questions
      .filter((q) => q.role === "practice")
      .sort((a, b) => a.position - b.position)
      .forEach((question) => items.push({ kind: "question", chapter, question }));
  });

  // 새 문제는 마지막 장에 붙는다 — 목록 끝에 쌓이는 것이 쓰는 순서와 맞는다.
  const last = chapters[chapters.length - 1];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-medium">
          장 {chapters.length} · 문제 {items.filter((i) => i.kind === "question").length}
        </h2>
        {failed && <span className="admin-error">{failed}</span>}
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="admin-link"
            onClick={() => setAdding((now) => (now === "chapter" ? null : "chapter"))}
          >
            + 장
          </button>
          <button
            type="button"
            className="admin-link"
            disabled={!last}
            title={last ? undefined : "장을 먼저 만드세요"}
            onClick={() => setAdding((now) => (now === "question" ? null : "question"))}
          >
            + 문제
          </button>
          <button
            type="button"
            className="admin-link"
            disabled={!last}
            onClick={() => setAdding((now) => (now === "existing" ? null : "existing"))}
          >
            있는 문제
          </button>
        </div>
      </div>

      {adding === "chapter" && (
        <form
          action={act}
          className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
        >
          <label className="grid gap-1">
            <span className="text-xs text-muted">주소에 쓸 이름 (slug)</span>
            <input name="slug" required placeholder="constant-names" className="admin-input mono" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted">제목</span>
            <input name="title" required placeholder="상수 이름" className="admin-input" />
          </label>
          <input type="hidden" name="body" value="" />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" className="admin-button" disabled={pending}>
              {pending ? "만드는 중" : "만들고 본문 쓰러 가기"}
            </button>
            {state.error && <span className="admin-error">{state.error}</span>}
          </div>
        </form>
      )}

      {adding === "question" && last && (
        <NewQuestionForm
          guide={guide}
          chapterId={last.id}
          chapterTitle={last.title}
          onDone={() => setAdding(null)}
        />
      )}

      {adding === "existing" && last && (
        <ExistingQuestionPicker
          guide={guide}
          chapterId={last.id}
          chapterTitle={last.title}
          taken={new Set(chapters.flatMap((c) => c.questions.map((q) => q.questionId)))}
          onDone={() => setAdding(null)}
        />
      )}

      <ul className="grid gap-1.5">
        {items.map((item) =>
          item.kind === "chapter" ? (
            <li key={`c${item.chapter.id}`} className="outline-row">
              <span className="outline-mark mono">{item.no}</span>
              <Link
                href={`/admin/${guide}/${item.chapter.id}`}
                className="font-medium hover:text-accent"
              >
                {item.chapter.title}
              </Link>
              <span className="mono text-xs text-muted">{item.chapter.slug}</span>
              {item.chapter.body.trim() === "" && (
                <span className="text-xs text-accent">본문 없음</span>
              )}
              <span className="ml-auto flex gap-1">
                <Move
                  guide={guide}
                  id={item.chapter.id}
                  disabledUp={item.no === 1}
                  disabledDown={item.no === chapters.length}
                  busy={busy}
                  start={start}
                  onFail={setFailed}
                />
              </span>
            </li>
          ) : (
            <li key={`q${item.chapter.id}-${item.question.questionId}`} className="outline-row outline-row--question">
              <span className="outline-mark outline-mark--question">✎</span>
              <button
                type="button"
                className="mono text-sm hover:text-accent"
                onClick={() =>
                  setOpen((now) => (now === item.question.questionId ? null : item.question.questionId))
                }
              >
                {item.question.answer}
              </button>
              {item.question.owner && (
                <span className="text-xs text-muted">{item.question.owner}</span>
              )}
              {item.question.ready ? (
                <span className="text-xs text-match">설명 있음</span>
              ) : (
                <span className="text-xs text-accent">설명 없음</span>
              )}
              <span className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  className="admin-link"
                  onClick={() =>
                    setOpen((now) =>
                      now === item.question.questionId ? null : item.question.questionId,
                    )
                  }
                >
                  {open === item.question.questionId ? "닫기" : "설명 쓰기"}
                </button>
                <button
                  type="button"
                  className="admin-link admin-link--danger"
                  disabled={busy}
                  onClick={() =>
                    start(async () =>
                      setFailed(
                        (await detach(guide, item.chapter.id, item.question.questionId, "practice"))
                          .error ?? null,
                      ),
                    )
                  }
                >
                  떼기
                </button>
              </span>
            </li>
          ),
        )}
        {items.length === 0 && (
          <li className="text-muted text-sm">아직 비어 있습니다. 장부터 만드세요.</li>
        )}
      </ul>

      {/* 설명 쓰기는 목록 아래에 펼친다. 줄 사이에 끼우면 목록이 흔들린다. */}
      {open && (
        <QuestionNote
          key={open}
          guide={guide}
          chapterId={
            items.find((i) => i.kind === "question" && i.question.questionId === open)!.chapter.id
          }
          questionId={open}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function Move({
  guide,
  id,
  disabledUp,
  disabledDown,
  busy,
  start,
  onFail,
}: {
  guide: string;
  id: number;
  disabledUp: boolean;
  disabledDown: boolean;
  busy: boolean;
  start: (fn: () => Promise<void>) => void;
  onFail: (message: string | null) => void;
}) {
  return (
    <>
      <button
        type="button"
        className="admin-icon"
        disabled={disabledUp || busy}
        onClick={() => start(async () => onFail((await moveChapter(guide, id, -1)).error ?? null))}
        aria-label="위로"
      >
        ↑
      </button>
      <button
        type="button"
        className="admin-icon"
        disabled={disabledDown || busy}
        onClick={() => start(async () => onFail((await moveChapter(guide, id, 1)).error ?? null))}
        aria-label="아래로"
      >
        ↓
      </button>
    </>
  );
}
