"use client";

import { useEffect, useState, useTransition } from "react";
import { Prose } from "@/components/Prose";
import { loadNote, removeQuestion, saveNote } from "@/app/admin/actions";

/**
 * 상황 설명과 해설.
 *
 * 둘이 내려가는 시점이 다르다. brief 는 문제와 함께 가고(풀기 전부터 보인다),
 * rationale 은 제출한 뒤에 간다 — 답 단어를 그대로 설명하는 글이라 미리
 * 보내면 답이 샌다.
 *
 * <p>다른 문제를 열면 이 컴포넌트를 새로 만든다(key). 안에서 상태를 되돌리는
 * 것보다 React 에게 맡기는 쪽이 샐 자리가 없다.
 */
export function QuestionNote({
  guide,
  chapterId,
  questionId,
  onClose,
}: {
  guide: string;
  chapterId: number;
  questionId: string;
  onClose: () => void;
}) {
  const [brief, setBrief] = useState("");
  const [rationale, setRationale] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, start] = useTransition();

  /*
   * 열릴 때 한 번만 읽는다.
   *
   * 전에는 그리는 도중에 불렀다. 응답이 오기 전에 다시 그려지면 또 부르고,
   * 바깥에서 상태가 하나 바뀔 때마다 그게 반복돼 요청이 폭주했다.
   */
  useEffect(() => {
    let alive = true;
    loadNote(questionId).then((note) => {
      if (!alive) return;
      setBrief(note.brief ?? "");
      setRationale(note.rationale ?? "");
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [questionId]);

  if (!loaded) {
    return <p className="text-xs text-muted">불러오는 중…</p>;
  }

  return (
    <div className="space-y-3 rounded-lg border border-accent bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="mono text-sm font-medium">{questionId}</span>
        <button type="button" className="admin-link ml-auto" onClick={onClose}>
          닫기
        </button>
      </div>

      <label className="grid gap-1">
        <span className="text-xs text-muted">
          이 함수가 하는 일 — <strong>풀기 전부터 보입니다.</strong> 코드 독해 부담을 덜어 주는
          글이라 답 단어가 얼마간 새는 것은 괜찮습니다
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
          해설 — <strong>제출한 뒤에 보입니다.</strong> 원저자가 어떤 원칙으로 이 이름을
          지었는지. 장 링크를 문장에 넣을 수 있습니다
        </span>
        <textarea
          value={rationale}
          onChange={(event) => {
            setRationale(event.target.value);
            setSaved(false);
            setFailed(null);
          }}
          className="admin-textarea admin-textarea--short"
          placeholder={`… [메서드 이름](/guide/${guide}/method-names) 참고`}
        />
      </label>

      {brief.trim() && (
        <div className="admin-preview admin-preview--small">
          <Prose>{brief}</Prose>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
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

        {/*
          자작 문제만 아주 지울 수 있다. 추출기가 가져온 것은 import 가 주인이라
          지워도 다음 import 가 되살린다 — 서버도 409 로 막는다.
        */}
        {questionId.startsWith("authored-") && (
          <button
            type="button"
            className="admin-link admin-link--danger ml-auto"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("이 문제를 아주 지웁니다.")) return;
              start(async () => {
                const result = await removeQuestion(guide, chapterId, questionId);
                if (result.error) setFailed(result.error);
                else onClose();
              });
            }}
          >
            문제 지우기
          </button>
        )}
      </div>
    </div>
  );
}
