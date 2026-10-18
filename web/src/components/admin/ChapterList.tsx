"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createChapter, moveChapter } from "@/app/admin/actions";
import type { ChapterRow } from "@/lib/admin";

/**
 * 장 목록. 순서 바꾸기와 새 장 추가.
 *
 * 순서는 위아래 한 칸씩만 옮긴다. 숫자를 직접 고치게 하지 않는 이유는
 * 서버가 이웃과 자리를 맞바꾸는 방식으로만 순서를 다루기 때문이다
 * (GuideEditor.moveChapter) — 화면이 숫자를 계산하면 규칙이 두 곳에 생긴다.
 */
export function ChapterList({ guide, chapters }: { guide: string; chapters: ChapterRow[] }) {
  const [busy, start] = useTransition();
  const [adding, setAdding] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-medium">장 {chapters.length}개</h2>
        <button type="button" className="admin-link" onClick={() => setAdding((now) => !now)}>
          {adding ? "닫기" : "새 장"}
        </button>
      </div>

      {adding && (
        <form
          action={createChapter.bind(null, guide)}
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
          <div className="sm:col-span-2">
            <button type="submit" className="admin-button">
              만들고 본문 쓰러 가기
            </button>
          </div>
        </form>
      )}

      <ul className="grid gap-2">
        {chapters.map((chapter, index) => {
          const practice = chapter.questions.filter((q) => q.role === "practice");
          const unready = practice.filter((q) => !q.ready).length;

          return (
            <li
              key={chapter.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <span className="mono text-xs text-muted w-6">{index + 1}</span>
              <Link href={`/admin/${guide}/${chapter.id}`} className="font-medium hover:text-accent">
                {chapter.title}
              </Link>
              <span className="mono text-xs text-muted">{chapter.slug}</span>

              {chapter.body.trim() === "" && (
                <span className="text-xs text-accent">본문 없음</span>
              )}
              {practice.length > 0 && (
                <span className="text-xs text-muted">
                  연습 {practice.length}
                  {unready > 0 && <span className="text-accent"> · 설명 안 쓴 것 {unready}</span>}
                </span>
              )}

              <span className="ml-auto flex gap-1">
                <button
                  type="button"
                  className="admin-icon"
                  disabled={index === 0 || busy}
                  onClick={() => start(() => void moveChapter(guide, chapter.id, -1))}
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-icon"
                  disabled={index === chapters.length - 1 || busy}
                  onClick={() => start(() => void moveChapter(guide, chapter.id, 1))}
                  aria-label="아래로"
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
        {chapters.length === 0 && <li className="text-muted text-sm">아직 장이 없습니다.</li>}
      </ul>
    </section>
  );
}
