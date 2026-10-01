"use client";

import { useEffect, useRef } from "react";

/**
 * 필터 드롭다운.
 *
 * 바탕은 <details> 다. 열고 닫는 일을 브라우저가 하므로 자바스크립트가
 * 없어도 동작하고 키보드도 그냥 된다. 스크립트는 <details> 가 혼자
 * 못 하는 두 가지, 바깥을 눌렀을 때와 Esc 를 눌렀을 때 닫는 것만 얹는다.
 *
 * 칸을 고르는 일은 안에 들어오는 링크가 한다 (목록 페이지가 넘긴다).
 * 필터 상태는 주소줄에 있고, 고르면 페이지가 다시 그려진다.
 */
export function FilterDropdown({
  label,
  /**
   * 이 축에 고른 값이 있는지.
   *
   * 버튼에는 라벨만 남기고 고른 값은 아래 칩 줄이 보여준다. 버튼에도
   * 값을 적으면 같은 말이 두 번 나오고, 라벨이 사라져 무엇을 고르는
   * 드롭다운이었는지 알 수 없게 된다. 테두리만 바꿔 표시한다.
   */
  active = false,
  align = "left",
  children,
}: {
  label: string;
  active?: boolean;
  /** 오른쪽 끝에 놓인 드롭다운은 패널을 오른쪽에 맞춰야 화면 밖으로 안 나간다. */
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const close = () => {
      details.open = false;
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!details.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        // 최소 폭을 줘서 캐럿이 오른쪽 끝에 붙는다. 라벨 길이가 제각각이라
        // (레벨 / JavaScript / 겹침 낮은 순) 폭을 안 주면 버튼마다 들쑥날쑥하다.
        className={`flex min-w-32 cursor-pointer list-none items-center gap-2 rounded-lg border px-4 py-2 text-sm [&::-webkit-details-marker]:hidden ${
          active
            ? "border-accent text-accent font-medium bg-surface"
            : "border-border bg-surface text-text hover:border-muted"
        }`}
      >
        {label}
        <Caret />
      </summary>

      {/* 고른 뒤에는 닫는다. 소프트 내비게이션이라 이 노드가 그대로 남는다. */}
      <div
        onClick={() => {
          if (ref.current) ref.current.open = false;
        }}
        className={`absolute z-20 mt-1 min-w-full overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </details>
  );
}

function Caret() {
  return (
    <svg viewBox="0 0 12 12" className="ml-auto h-3 w-3 shrink-0 opacity-60" aria-hidden="true">
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 드롭다운 안의 한 칸.
 *
 * 개수는 오른쪽에 흐리게 둔다. 0인 칸은 눌러도 빈 목록이라 흐리고,
 * 지금 고른 칸은 강조한다.
 */
export function FilterOption({
  active,
  count,
  children,
}: {
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex items-center justify-between gap-8 whitespace-nowrap px-4 py-2 text-sm ${
        active
          ? "bg-accent-soft font-medium text-accent"
          : count === 0
            ? "text-muted/40"
            : "text-text hover:bg-accent-soft/60"
      }`}
    >
      {children}
      {count !== undefined && <span className="tabular-nums opacity-50">{count}</span>}
    </span>
  );
}
