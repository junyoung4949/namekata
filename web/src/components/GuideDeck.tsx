"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 장을 가로로 넘겨 읽는 틀.
 *
 * 세로로 길게 잇지 않고 한 판에 한 장씩 두는 이유는, 장이 원문의 절 하나에
 * 해당해서 길이가 들쭉날쭉하기 때문이다. 두 문장짜리 절과 표가 든 절이
 * 한 흐름에 섞이면 어디가 끝인지 보이지 않는다.
 *
 * 긴 장은 판 안에서 세로로 스크롤된다. 그래서 스와이프는 가로로 움직인
 * 거리가 세로보다 뚜렷이 클 때만 장을 넘긴다 — 읽다가 손가락이 틀어졌다고
 * 장이 넘어가면 읽을 수가 없다.
 */
export function GuideDeck({
  titles,
  children,
}: {
  /** 장 제목. 번호 줄과 현재 위치 표시에 쓴다. */
  titles: string[];
  /** 장 본문. titles 와 같은 순서여야 한다. */
  children: React.ReactNode[];
}) {
  const [at, setAt] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const count = titles.length;

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
      <nav className="deck-jump" aria-label="장 이동">
        {titles.map((title, index) => (
          <button
            key={index}
            type="button"
            title={title}
            aria-current={index === at}
            onClick={() => go(index)}
          >
            {index + 1}
          </button>
        ))}
      </nav>

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
          {children.map((panel, index) => (
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
              {panel}
            </div>
          ))}
        </div>
        <div className="deck-bar" style={{ width: `${((at + 1) / count) * 100}%` }} />
      </div>

      <div className="deck-pager">
        <span className="deck-label">{titles[at]}</span>
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
