"use client";

import { useState, useTransition } from "react";
import { Prose } from "@/components/Prose";
import { removeChapter, saveChapter } from "@/app/admin/actions";
import type { ChapterRow } from "@/lib/admin";

/**
 * 장 본문 편집. 왼쪽에 마크다운, 오른쪽에 미리보기.
 *
 * 미리보기의 코드 블록은 실제 화면과 다르다. 가이드 쪽은 서버에서 shiki 로
 * 토큰화해 IDE 배색을 입히는데(lib/chapter.ts), 그건 server-only 이고
 * 비동기라 타이핑하는 동안 부를 수 없다. 여기서는 글의 구조만 본다 —
 * 제목 단계, 목록, 표, 형광펜이 맞게 걸렸는지.
 */
export function ChapterEditor({ guide, chapter }: { guide: string; chapter: ChapterRow }) {
  const [body, setBody] = useState(chapter.body);
  const [busy, start] = useTransition();
  const dirty = body !== chapter.body;

  return (
    <section className="space-y-3">
      <form action={saveChapter.bind(null, guide, chapter.id)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-muted">제목</span>
            <input name="title" defaultValue={chapter.title} required className="admin-input" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted">주소에 쓸 이름 (slug)</span>
            <input name="slug" defaultValue={chapter.slug} required className="admin-input mono" />
          </label>
        </div>

        <div className="admin-split">
          <label className="grid gap-1 min-w-0">
            <span className="text-xs text-muted">
              본문 (마크다운) · <code>**굵게**</code> 는 형광펜, <code>```java</code> 는 코드
            </span>
            <textarea
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              spellCheck={false}
              className="admin-textarea mono"
              placeholder="메서드 이름은 `lowerCamelCase` 로 쓴다."
            />
          </label>

          <div className="grid gap-1 min-w-0">
            <span className="text-xs text-muted">미리보기 (코드 색은 실제 화면에서 입혀집니다)</span>
            <div className="admin-preview">
              {body.trim() ? <Prose>{body}</Prose> : <p className="text-muted text-sm">비어 있습니다.</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="admin-button">
            저장
          </button>
          {dirty && <span className="text-xs text-accent">저장하지 않은 변경이 있습니다</span>}
          <button
            type="button"
            className="admin-link admin-link--danger ml-auto"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`"${chapter.title}" 장을 지웁니다.`)) {
                start(() => void removeChapter(guide, chapter.id));
              }
            }}
          >
            장 지우기
          </button>
        </div>
      </form>
    </section>
  );
}
