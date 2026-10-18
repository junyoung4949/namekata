"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeckPanel = {
  /** 탭의 툴팁과 판 안의 머리줄에 쓴다. */
  title: string;
  /**
   * 탭에 찍을 글자.
   *
   * 판 순번을 그대로 쓰지 않는다. 연습 판이 장 사이에 끼어 있어서, 세 번째
   * 판이 세 번째 장이 아닐 수 있다. 무엇을 찍을지는 페이지가 정한다.
   */
  label: string;
  /** 연습 판은 탭에서 다르게 칠한다 — 읽는 판과 푸는 판이 섞여 있다. */
  kind: "chapter" | "practice";
  node: React.ReactNode;
};

/**
 * 장을 가로로 넘겨 읽는 틀.
 *
 * 오른쪽에 공책 색인 같은 탭을 세워 둔다. 지금 어디를 읽고 있는지가 늘
 * 보이고, 누르면 바로 간다. 넘길 수 있는 화면이라는 것도 이 탭이 알려준다 —
 * 번호 줄을 위에 눕혀 두면 그냥 목차로 읽히고 만다.
 *
 * 긴 장은 판 안에서 세로로 스크롤된다. 그래서 스와이프는 가로로 움직인
 * 거리가 세로보다 뚜렷이 클 때만 장을 넘긴다 — 읽다가 손가락이 틀어졌다고
 * 장이 넘어가면 읽을 수가 없다.
 */
export function GuideDeck({
  panels: items,
  footer,
}: {
  panels: DeckPanel[];
  /** 아래 줄 왼쪽에 작게 깔 것. 출처 표기가 여기 들어간다. */
  footer?: React.ReactNode;
}) {
  const [at, setAt] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const count = items.length;

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      setAt(clamped);
      panels.current[clamped]?.scrollTo({ top: 0 });
    },
    [count],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      // 입력 중일 때는 넘기지 않는다 (연습 칸의 이름 입력).
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "ArrowRight") {
        setAt((now) => Math.min(count - 1, now + 1));
      } else if (event.key === "ArrowLeft") {
        setAt((now) => Math.max(0, now - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  return (
    <div className="deck">
      <div className="deck-body">
        <div
          className="deck-view"
          onTouchStart={(event) => {
            touch.current = {
              x: event.changedTouches[0].clientX,
              y: event.changedTouches[0].clientY,
            };
          }}
          onTouchEnd={(event) => {
            const from = touch.current;
            touch.current = null;
            if (!from) return;
            const dx = event.changedTouches[0].clientX - from.x;
            const dy = event.changedTouches[0].clientY - from.y;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              go(dx < 0 ? at + 1 : at - 1);
            }
          }}
        >
          <div className="deck-track" style={{ transform: `translateX(-${at * 100}%)` }}>
            {items.map((item, index) => (
              <div
                key={index}
                className="deck-panel"
                ref={(node) => {
                  panels.current[index] = node;
                }}
                // 보이지 않는 판은 탭 순서와 읽기에서 뺀다.
                inert={index !== at}
                aria-hidden={index !== at}
              >
                {item.node}
              </div>
            ))}
          </div>
          <div className="deck-bar" style={{ width: `${((at + 1) / count) * 100}%` }} />
        </div>

        {/* 공책 색인. 넓은 화면에서는 오른쪽에 세우고, 좁으면 위에 눕힌다. */}
        <nav className="deck-tabs" aria-label="장 이동">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              title={item.title}
              data-kind={item.kind}
              aria-current={index === at}
              onClick={() => go(index)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="deck-pager">
        {footer}
        <span className="deck-count mono">
          {at + 1} / {count}
        </span>
        <button type="button" onClick={() => go(at - 1)} disabled={at === 0} aria-label="이전 장">
          ←
        </button>
        <button
          type="button"
          onClick={() => go(at + 1)}
          disabled={at === count - 1}
          aria-label="다음 장"
        >
          →
        </button>
      </div>
    </div>
  );
}
