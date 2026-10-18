"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Prose } from "@/components/Prose";
import { removeChapter, saveChapter, type ActionResult } from "@/app/admin/actions";
import type { ChapterRow } from "@/lib/admin";

/**
 * 장 본문 편집. 왼쪽에 마크다운, 오른쪽에 미리보기.
 *
 * 미리보기의 코드 블록은 실제 화면과 다르다. 가이드 쪽은 서버에서 shiki 로
 * 토큰화해 IDE 배색을 입히는데(lib/chapter.ts), 그건 server-only 이고
 * 비동기라 타이핑하는 동안 부를 수 없다. 여기서는 글의 구조만 본다 —
 * 제목 단계, 목록, 표, 형광펜이 맞게 걸렸는지.
 *
 * "저장 안 함" 표시는 **보낸 값이 들어갔다는 답을 받은 시점**을 기준으로
 * 한다. 전에는 서버에서 내려온 chapter.body 와 비교했는데, 저장이 끝나도
 * 그 prop 이 갱신되기 전까지 표시가 남아서 "저장이 안 된다"처럼 보였다.
 */
export function ChapterEditor({ guide, chapter }: { guide: string; chapter: ChapterRow }) {
  const [body, setBody] = useState(chapter.body);
  /** 서버에 들어간 것으로 확인된 본문. 이것과 다르면 아직 저장 전이다. */
  const [saved, setSaved] = useState(chapter.body);
  const [result, setResult] = useState<ActionResult>({});
  const [pending, start] = useTransition();

  const dirty = body !== saved;

  /**
   * 폼이 보낸 값을 그대로 쥐고 있다가, 성공하면 그 값을 기준선으로 옮긴다.
   *
   * 서버가 다시 그려 주기를 기다리지 않는다 — 들어간 값을 아는 쪽은 보낸
   * 이 자리이고, 기다리면 그 사이에 표시가 거짓말을 한다.
   */
  async function submit(form: FormData) {
    const sent = String(form.get("body") ?? "");
    const answered = await saveChapter(guide, chapter.id, {}, form);
    setResult(answered);
    if (!answered.error) setSaved(sent);
  }

  return (
    <section className="space-y-3">
      <form action={submit} className="space-y-3">
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

        <div className="flex flex-wrap items-center gap-3">
          <Save />

          {result.error ? (
            <span className="admin-error">{result.error}</span>
          ) : dirty ? (
            <span className="text-xs text-accent">저장하지 않은 변경이 있습니다</span>
          ) : (
            result.savedAt && <span className="text-xs text-match">저장했습니다</span>
          )}

          <button
            type="button"
            className="admin-link admin-link--danger ml-auto"
            disabled={pending}
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

/** 폼이 보내는 동안 눌리지 않게. 상태는 폼이 알고 있다. */
function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-button" disabled={pending}>
      {pending ? "저장하는 중" : "저장"}
    </button>
  );
}

