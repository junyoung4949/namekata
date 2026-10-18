"use client";

import { useState, useTransition } from "react";
import { attach, detach, loadNote, saveNote, search } from "@/app/admin/actions";
import { Prose } from "@/components/Prose";
import type { Attached, ChapterRow, QuestionRow } from "@/lib/admin";

/**
 * 장에 붙은 문제와, 붙일 문제 고르기.
 *
 * 붙이는 행위가 곧 승인이다 — 따로 검수 단계가 없는 이유다. 대신 상황
 * 설명(brief)을 쓰지 않은 문제는 연습 칸이 빈 채로 나오므로, 안 쓴 것을
 * 눈에 띄게 표시한다.
 */
export function ChapterQuestions({ guide, chapter }: { guide: string; chapter: ChapterRow }) {
  const practice = chapter.questions.filter((q) => q.role === "practice");
  const reference = chapter.questions.filter((q) => q.role === "reference");

  return (
    <section className="space-y-5">
      <h2 className="font-medium">문제</h2>

      <Group
        title="이 장의 연습 문제"
        hint="장 끝에 연습 판으로 붙습니다."
        guide={guide}
        chapter={chapter}
        role="practice"
        rows={practice}
      />
      <Group
        title="해설이 가리키는 장으로 연결"
        hint="여기 붙인 문제를 풀면 제출 뒤에 이 장으로 가는 링크가 뜹니다."
        guide={guide}
        chapter={chapter}
        role="reference"
        rows={reference}
      />
    </section>
  );
}

function Group({
  title,
  hint,
  guide,
  chapter,
  role,
  rows,
}: {
  title: string;
  hint: string;
  guide: string;
  chapter: ChapterRow;
  role: "practice" | "reference";
  rows: Attached[];
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <div className="flex items-center gap-3">
          {failed && <span className="admin-error">{failed}</span>}
          <button type="button" className="admin-link" onClick={() => setOpen((now) => !now)}>
            {open ? "닫기" : "문제 붙이기"}
          </button>
        </div>
      </div>

      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.questionId}>
            <AttachedRow guide={guide} chapterId={chapter.id} row={row} />
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-muted">없습니다.</li>}
      </ul>

      {open && (
        <Picker
          onPick={(question) =>
            start(async () => {
              const result = await attach(guide, chapter.id, question.id, role);
              if (result.error) setFailed(result.error);
              else setOpen(false);
            })
          }
          busy={busy}
          taken={new Set(rows.map((row) => row.questionId))}
        />
      )}
    </div>
  );
}

/** 붙은 문제 한 줄. 펼치면 상황 설명과 해설을 쓴다. */
function AttachedRow({
  guide,
  chapterId,
  row,
}: {
  guide: string;
  chapterId: number;
  row: Attached;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <div className="rounded border border-border">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="mono text-sm">{row.answer}</span>
        {row.owner && <span className="text-xs text-muted">{row.owner}</span>}
        {row.ready ? (
          <span className="text-xs text-match">설명 있음</span>
        ) : (
          <span className="text-xs text-accent">설명 없음</span>
        )}
        {failed && <span className="admin-error">{failed}</span>}
        <span className="ml-auto flex gap-3">
          <button type="button" className="admin-link" onClick={() => setOpen((now) => !now)}>
            {open ? "닫기" : "설명 쓰기"}
          </button>
          <button
            type="button"
            className="admin-link admin-link--danger"
            disabled={busy}
            onClick={() =>
              start(async () =>
                setFailed((await detach(guide, chapterId, row.questionId, row.role)).error ?? null),
              )
            }
          >
            떼기
          </button>
        </span>
      </div>
      {open && (
        <NoteForm
          guide={guide}
          chapterId={chapterId}
          questionId={row.questionId}
          answer={row.answer}
        />
      )}
    </div>
  );
}

/**
 * 상황 설명과 해설.
 *
 * 둘이 내려가는 시점이 다르다. brief 는 문제와 함께 가고(풀기 전부터 보인다),
 * rationale 은 제출한 뒤에 간다 — 답 단어를 그대로 설명하는 글이라 미리
 * 보내면 답이 샌다.
 */
function NoteForm({
  guide,
  chapterId,
  questionId,
  answer,
}: {
  guide: string;
  chapterId: number;
  questionId: string;
  answer: string;
}) {
  const [brief, setBrief] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, start] = useTransition();

  // 처음 펼칠 때 한 번만 읽어 온다.
  if (brief === null) {
    void loadNote(questionId).then((note) => {
      setBrief(note.brief ?? "");
      setRationale(note.rationale ?? "");
    });
    return <p className="px-3 pb-3 text-xs text-muted">불러오는 중…</p>;
  }

  return (
    <div className="border-t border-border px-3 py-3 space-y-3">
      <label className="grid gap-1">
        <span className="text-xs text-muted">
          이 함수가 하는 일 — <strong>풀기 전부터 보입니다.</strong> 코드 독해 부담을 덜어 주는 글이라
          답 단어가 얼마간 새는 것은 괜찮습니다
        </span>
        <textarea
          value={brief}
          onChange={(event) => {
            setBrief(event.target.value);
            setSaved(false);
            setFailed(null);
          }}
          className="admin-textarea admin-textarea--short"
          placeholder="값 하나를 받아 true/false 를 돌려줍니다…"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-muted">
          해설 — <strong>제출한 뒤에 보입니다.</strong> 원저자가 어떤 원칙으로 이 이름을 지었는지.
          장 링크를 문장에 넣을 수 있습니다
        </span>
        <textarea
          value={rationale}
          onChange={(event) => {
            setRationale(event.target.value);
            setSaved(false);
            setFailed(null);
          }}
          className="admin-textarea admin-textarea--short"
          placeholder={`\`${answer}\` 는 … [메서드 이름](/guide/${guide}/method-names) 참고`}
        />
      </label>

      {brief.trim() && (
        <div className="admin-preview admin-preview--small">
          <Prose>{brief}</Prose>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const result = await saveNote(guide, chapterId, questionId, {
                brief: brief.trim() || null,
                rationale: rationale.trim() || null,
              });
              setFailed(result.error ?? null);
              setSaved(!result.error);
            })
          }
        >
          저장
        </button>
        {failed ? (
          <span className="admin-error">{failed}</span>
        ) : (
          saved && <span className="text-xs text-match">저장했습니다</span>
        )}
      </div>
    </div>
  );
}

/** 붙일 문제 고르기. 답이 보이는 목록이다 — 고르려면 답을 봐야 한다. */
function Picker({
  onPick,
  busy,
  taken,
}: {
  onPick: (question: QuestionRow) => void;
  busy: boolean;
  taken: Set<string>;
}) {
  const [rows, setRows] = useState<QuestionRow[] | null>(null);
  const [language, setLanguage] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [, start] = useTransition();

  function run() {
    start(async () => setRows(await search({ language, kind, q })));
  }

  return (
    <div className="space-y-2 rounded border border-border bg-bg p-3">
      <div className="flex flex-wrap gap-2">
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="admin-input admin-input--small">
          <option value="">언어 전체</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="admin-input admin-input--small">
          <option value="">종류 전체</option>
          <option value="method">함수</option>
          <option value="variable">변수</option>
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

      {rows && (
        <ul className="admin-picker">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-sm">
              <span className="mono">{row.answer}</span>
              <span className="text-xs text-muted">
                {row.owner ? `${row.owner} · ` : ""}
                {row.repo}
              </span>
              {!row.ready && <span className="text-xs text-accent">설명 없음</span>}
              {taken.has(row.id) ? (
                <span className="ml-auto text-xs text-muted">이미 붙음</span>
              ) : (
                <button
                  type="button"
                  className="admin-link ml-auto"
                  disabled={busy}
                  onClick={() => onPick(row)}
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
