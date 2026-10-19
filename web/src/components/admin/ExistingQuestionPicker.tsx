"use client";

import { useState, useTransition } from "react";
import { attach, search } from "@/app/admin/actions";
import type { QuestionRow } from "@/lib/admin";

/**
 * 이미 들어와 있는 문제에서 고른다. 답이 보이는 목록이다 — 고르려면 답을 봐야 한다.
 *
 * 새로 만드는 쪽(NewQuestionForm)이 기본이고 이쪽은 보조다. 추출기가 가져온
 * 113개 중에 마침 맞는 것이 있을 때 쓴다.
 */
export function ExistingQuestionPicker({
  guide,
  chapterId,
  chapterTitle,
  taken,
  onDone,
}: {
  guide: string;
  chapterId: number;
  chapterTitle: string;
  taken: Set<string>;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<QuestionRow[] | null>(null);
  const [language, setLanguage] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function run() {
    start(async () => setRows(await search({ language, kind, q })));
  }

  return (
    <div className="space-y-2 rounded border border-border bg-bg p-3">
      <p className="text-xs text-muted">
        고른 문제는 <strong>{chapterTitle}</strong> 뒤에 붙습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="admin-input admin-input--small"
        >
          <option value="">언어 전체</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="admin-input admin-input--small"
        >
          <option value="">종류 전체</option>
          <option value="method">함수</option>
          <option value="variable">변수</option>
          <option value="class">클래스</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="이름으로 찾기"
          className="admin-input admin-input--small mono flex-1 min-w-32"
        />
        <button type="button" className="admin-button admin-button--small" onClick={run}>
          찾기
        </button>
      </div>

      {failed && <p className="admin-error">{failed}</p>}

      {rows && (
        <ul className="admin-picker">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-sm">
              <span className="mono">{row.answer}</span>
              <span className="text-xs text-muted">
                {row.owner ? `${row.owner} · ` : ""}
                {row.repo ?? "자작"}
              </span>
              {!row.ready && <span className="text-xs text-accent">설명 없음</span>}
              {taken.has(row.id) ? (
                <span className="ml-auto text-xs text-muted">이미 붙음</span>
              ) : (
                <button
                  type="button"
                  className="admin-link ml-auto"
                  disabled={busy}
                  onClick={() =>
                    start(async () => {
                      const result = await attach(guide, chapterId, row.id, "practice");
                      if (result.error) setFailed(result.error);
                      else onDone();
                    })
                  }
                >
                  붙이기
                </button>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="px-2 py-1.5 text-xs text-muted">없습니다.</li>}
        </ul>
      )}
    </div>
  );
}
