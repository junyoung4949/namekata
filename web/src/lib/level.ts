import type { Level, QuestionStats } from "./types";

/**
 * lv0~lv5 를 정한다.
 *
 * 추출기(tools/extract 의 estimate_level)가 코드만 보고 매긴 등급으로
 * 시작하고, 실제로 푼 사람이 충분히 모인 문제는 그 결과로 덮어쓴다.
 *
 * 둘을 섞지 않고 갈아타는 이유: 표본이 적을 때 평균을 내면 한두 사람의
 * 답이 등급을 흔든다. 믿을 만해지는 지점을 정해 두고 그 전까지는 휴리스틱
 * 하나만 쓰는 편이 등급이 덜 튄다.
 */

/**
 * 실측으로 갈아타는 표본 수.
 *
 * 20명이면 겹침률의 표준오차가 대략 ±11%p다. 등급 한 칸이 20%p 폭이니
 * 한 칸 안에서 흔들리는 정도로 들어온다.
 */
export const STATS_THRESHOLD = 20;

/** 겹침률이 높을수록 쉬운 문제다. 경계는 20%p씩 자른다. */
const RATE_CUTS = [0.9, 0.75, 0.6, 0.45, 0.25];

export type ResolvedLevel = {
  level: Level;
  /** 실측으로 덮어쓴 등급인지. 화면에서 표시를 달리한다. */
  measured: boolean;
};

export function resolveLevel(base: number, stats?: QuestionStats): ResolvedLevel {
  const fallback = clamp(base);
  if (!stats || stats.total < STATS_THRESHOLD) {
    return { level: fallback, measured: false };
  }
  const rate = stats.partial / stats.total;
  return { level: clamp(RATE_CUTS.filter((cut) => rate < cut).length), measured: true };
}

function clamp(value: number): Level {
  return Math.min(5, Math.max(0, Math.round(value))) as Level;
}

/** 비율을 퍼센트 정수로. 표본이 없으면 null (화면에서 자리를 비운다). */
export function rate(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((part / total) * 100);
}
