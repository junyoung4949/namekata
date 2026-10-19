"use client";

import { useState, useTransition } from "react";
import { writeQuestion } from "@/app/admin/actions";

/**
 * 문제를 그 자리에서 만든다.
 *
 * 글 쓰는 흐름이 "장을 쓰고 → 거기 필요한 문제를 만들고 → 다음 장" 이어야
 * 하는데, 미리 넣어 둔 것에서 고르기만 하면 그 흐름이 끊긴다.
 *
 * **가리는 일은 서버가 한다.** 여기서 하면 같은 규칙이 두 곳에 생기고,
 * 브라우저가 가린 결과를 그대로 믿는 길이 열린다. 답이 코드에 없거나 가린
 * 뒤에도 보이면 서버가 거절하고, 그 이유가 아래에 뜬다.
 */
export function NewQuestionForm({
  guide,
  chapterId,
  chapterTitle,
  onDone,
}: {
  guide: string;
  chapterId: number;
  /** 새 문제가 어느 장 뒤에 붙는지. 목록 끝에 쌓이는 것이 쓰는 순서와 맞는다. */
  chapterTitle: string;
  onDone: () => void;
}) {
  const [language, setLanguage] = useState("java");
  const [kind, setKind] = useState("method");
  const [answer, setAnswer] = useState("");
  const [code, setCode] = useState("");
  const [owner, setOwner] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, start] = useTransition();

  // 가린 모습을 미리 보여 준다. 서버가 쓰는 것과 같은 규칙이지만 여기서는
  // 눈으로 보기 위한 것일 뿐이고, 실제로 저장되는 것은 서버가 만든다.
  const preview =
    answer.trim() && code
      ? code.replace(
          new RegExp(
            `(?<![A-Za-z0-9_$])${answer.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_$])`,
            "g",
          ),
          "___NAME___",
        )
      : code;
  const found = preview !== code;

  return (
    <div className="space-y-3 rounded border border-border bg-bg p-3">
      <p className="text-xs text-muted">
        만든 문제는 <strong>{chapterTitle}</strong> 뒤에 붙습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="admin-input admin-input--small"
        >
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="admin-input admin-input--small"
        >
          <option value="method">함수</option>
          <option value="variable">변수</option>
          <option value="class">클래스</option>
        </select>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="가릴 이름 (원본 답)"
          className="admin-input admin-input--small mono flex-1 min-w-40"
        />
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="감싸는 클래스 (선택)"
          className="admin-input admin-input--small mono"
        />
      </div>

      <label className="grid gap-1">
        <span className="text-xs text-muted">
          코드 — 붙여넣으면 위에 적은 이름이 나오는 자리를 전부 가립니다
        </span>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="admin-textarea admin-textarea--short mono"
          placeholder={"public static boolean hasText(CharSequence str) {\n  ...\n}"}
        />
      </label>

      {answer.trim() && code.trim() && (
        <div className="text-xs">
          {found ? (
            <span className="text-match">
              가릴 자리 {preview.split("___NAME___").length - 1}곳을 찾았습니다
            </span>
          ) : (
            <span className="text-accent">
              코드에서 <code className="mono">{answer.trim()}</code> 을(를) 찾지 못했습니다
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="admin-button"
          disabled={busy || !answer.trim() || !code.trim() || !found}
          onClick={() =>
            start(async () => {
              const result = await writeQuestion(guide, chapterId, {
                language,
                kind,
                answer: answer.trim(),
                code,
                owner: owner.trim() || null,
                docstring: null,
              });
              if (result.error) setFailed(result.error);
              else {
                setAnswer("");
                setCode("");
                setOwner("");
                setFailed(null);
                onDone();
              }
            })
          }
        >
          {busy ? "만드는 중" : "만들어 붙이기"}
        </button>
        {failed && <span className="admin-error">{failed}</span>}
        <span className="text-xs text-muted ml-auto">
          만든 뒤 &quot;설명 쓰기&quot;로 상황 설명을 채워야 연습 칸이 채워집니다
        </span>
      </div>
    </div>
  );
}
