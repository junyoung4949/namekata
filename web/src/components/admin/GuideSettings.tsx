"use client";

import { useTransition } from "react";
import { removeGuide, saveGuide, setPublished } from "@/app/admin/actions";
import type { GuideRow } from "@/lib/admin";

/**
 * 가이드 설정. 제목·언어·소개와 원문 표기, 공개 여부.
 *
 * 원문 표기를 여기 둔 이유는 라이선스 의무이기 때문이다. 구글 스타일가이드는
 * CC-BY 3.0 이라 저작자 표시와 개작(번역) 사실 명시를 요구한다. 비워 두면
 * 가이드 화면이 출처 줄을 아예 그리지 않는다 — 자작 가이드일 때가 그렇다.
 */
export function GuideSettings({ guide }: { guide: GuideRow }) {
  const [busy, start] = useTransition();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">가이드 설정</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="admin-link"
            disabled={busy}
            onClick={() => start(() => void setPublished(guide.slug, guide.status !== "published"))}
          >
            {guide.status === "published" ? "비공개로 내리기" : "공개하기"}
          </button>
          <button
            type="button"
            className="admin-link admin-link--danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`"${guide.title}" 을(를) 지웁니다. 장과 연결도 함께 사라집니다.`)) {
                start(() => void removeGuide(guide.slug));
              }
            }}
          >
            지우기
          </button>
        </div>
      </div>

      <form
        action={saveGuide.bind(null, guide.slug)}
        className="grid gap-3 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
      >
        <label className="grid gap-1">
          <span className="text-xs text-muted">제목</span>
          <input name="title" defaultValue={guide.title} required className="admin-input" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted">언어</span>
          <select name="language" defaultValue={guide.language} className="admin-input">
            <option value="common">공통</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-xs text-muted">한 줄 소개</span>
          <input name="lede" defaultValue={guide.lede ?? ""} className="admin-input" />
        </label>

        <p className="sm:col-span-2 text-xs text-muted pt-2">
          원문 표기 — 번역을 실으면 라이선스가 요구합니다. 비워 두면 출처 줄을 그리지 않습니다.
        </p>
        <label className="grid gap-1">
          <span className="text-xs text-muted">원문 제목</span>
          <input name="sourceTitle" defaultValue={guide.sourceTitle ?? ""} className="admin-input" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted">라이선스</span>
          <input
            name="sourceLicense"
            defaultValue={guide.sourceLicense ?? ""}
            placeholder="CC-BY-3.0"
            className="admin-input mono"
          />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-xs text-muted">원문 주소</span>
          <input
            name="sourceUrl"
            defaultValue={guide.sourceUrl ?? ""}
            className="admin-input mono"
          />
        </label>

        <div className="sm:col-span-2">
          <button type="submit" className="admin-button">
            저장
          </button>
        </div>
      </form>
    </section>
  );
}
