import type { Level } from "./types";

/**
 * 등급 표시에 쓰는 것들.
 *
 * 등급을 **정하는** 규칙은 서버에 있다 (server 의 naming.LevelPolicy) — 추출기가
 * 코드만 보고 매긴 등급으로 시작하고, 충분히 풀린 문제는 실제 겹침률로 덮는다.
 *
 * 전에는 그 규칙이 여기에도 한 벌 있었다 (resolveLevel + 표본 기준 20 + 경계
 * 다섯 개). 문제를 파일에서 읽던 시절에는 등급을 매길 사람이 웹뿐이라 필요했지만,
 * 지금은 서버가 measuredLevel 까지 실어 보내므로 쓰이지 않아 지웠다. 같은 숫자를
 * 두 곳에 두면 한쪽만 고쳐졌을 때 목록 정렬이 조용히 어긋난다.
 */

export type ResolvedLevel = {
  level: Level;
  /** 실측으로 덮어쓴 등급인지. 화면에서 표시를 달리한다. */
  measured: boolean;
};

/** 비율을 퍼센트 정수로. 표본이 없으면 null (화면에서 자리를 비운다). */
export function rate(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((part / total) * 100);
}
