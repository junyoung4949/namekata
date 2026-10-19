"use client";

import { useActionState } from "react";
import { createGuide, type ActionResult } from "@/app/admin/actions";

export function NewGuideForm() {
  const [state, act, pending] = useActionState<ActionResult, FormData>(createGuide, {});

  return (
    <form action={act} className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">
        <span className="text-xs text-muted">주소에 쓸 이름 (slug)</span>
        <input
          name="slug"
          required
          placeholder="google-python-naming"
          className="admin-input mono"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-muted">언어</span>
        <select name="language" defaultValue="common" className="admin-input">
          <option value="common">공통</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-xs text-muted">제목</span>
        <input
          name="title"
          required
          placeholder="구글 파이썬 스타일가이드 · 네이밍"
          className="admin-input"
        />
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-xs text-muted">한 줄 소개 (홈 카드에 쓰입니다)</span>
        <input name="lede" className="admin-input" />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" className="admin-button" disabled={pending}>
          {pending ? "만드는 중" : "만들기"}
        </button>
        {state.error && <span className="admin-error">{state.error}</span>}
      </div>
    </form>
  );
}
