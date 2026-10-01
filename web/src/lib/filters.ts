import type { RatedQuestion } from "./questions";
import type { Language, Level } from "./types";

/**
 * 목록 화면의 거르기와 정렬.
 *
 * 상태는 전부 주소줄에 둔다. 문제 목록은 서버에서 그리고, 필터는 링크라
 * 자바스크립트 없이도 동작하며, 고른 조건이 그대로 공유되는 주소가 된다.
 *
 * 레벨은 추출기가 매긴 raw level 이 아니라 실측 보정을 거친 값(rated)으로
 * 거른다. 화면에 lv2 라고 적힌 문제가 lv2 필터에 걸려야 하기 때문이다.
 */

export const LANGUAGES = ["java", "python", "javascript"] as const;
export const LEVELS = [0, 1, 2, 3, 4, 5] as const;
/** 클래스 이름은 아직 추출기가 뽑지 않는다 (tools/extract 의 extract_targets). */
export const KINDS = ["method", "variable"] as const;
export const SORTS = ["default", "level-asc", "level-desc", "hardest"] as const;

export type Kind = (typeof KINDS)[number];
export type Sort = (typeof SORTS)[number];

/** 축마다 "all" 이 하나씩 더 있다. 화면의 "전체" 칸이다. */
export const ALL = "all" as const;
export type All = typeof ALL;

export type Filters = {
  lang: Language | All;
  level: Level | All;
  kind: Kind | All;
  sort: Sort;
};

export const DEFAULTS: Filters = { lang: ALL, level: ALL, kind: ALL, sort: "default" };

export type Params = { lang?: string; lv?: string; kind?: string; sort?: string };

export function parseFilters(params: Params): Filters {
  const level = Number(params.lv);
  return {
    lang: pick(LANGUAGES, params.lang),
    level: (LEVELS as readonly number[]).includes(level) ? (level as Level) : ALL,
    kind: pick(KINDS, params.kind),
    sort: (SORTS as readonly string[]).includes(params.sort ?? "")
      ? (params.sort as Sort)
      : "default",
  };
}

function pick<T extends string>(allowed: readonly T[], value: string | undefined): T | All {
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : ALL;
}

/** 기본값은 주소에서 뺀다. 아무것도 안 고른 목록의 주소가 그냥 "/" 이도록. */
export function toQuery(filters: Filters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.lang !== ALL) query.lang = filters.lang;
  if (filters.level !== ALL) query.lv = String(filters.level);
  if (filters.kind !== ALL) query.kind = filters.kind;
  if (filters.sort !== "default") query.sort = filters.sort;
  return query;
}

export function isDefault(filters: Filters): boolean {
  return Object.keys(toQuery(filters)).length === 0;
}

export function apply(questions: RatedQuestion[], filters: Filters): RatedQuestion[] {
  return questions.filter(
    (question) =>
      (filters.lang === ALL || question.language === filters.lang) &&
      (filters.level === ALL || question.rated.level === filters.level) &&
      (filters.kind === ALL || question.kind === filters.kind),
  );
}

/**
 * 한 축의 칸마다 몇 문제가 남는지.
 *
 * 세는 동안 나머지 축은 고른 대로 둔다. Java 를 고른 뒤 레벨 칸에 찍히는
 * 수는 Java 안에서의 수여야 한다 — 전체 수를 그대로 두면 0이 아닌 줄 알고
 * 눌렀다가 빈 목록을 보게 된다.
 */
export function facet<K extends "lang" | "level" | "kind">(
  questions: RatedQuestion[],
  filters: Filters,
  axis: K,
  values: readonly (Filters[K] | All)[],
): { value: Filters[K] | All; count: number }[] {
  return values.map((value) => ({
    value,
    count: apply(questions, { ...filters, [axis]: value }).length,
  }));
}

/** 겹침률. 표본이 없으면 맨 뒤로 보내기 위해 Infinity. */
function overlap(question: RatedQuestion): number {
  const { total, partial } = question.stats;
  return total === 0 ? Infinity : partial / total;
}

export function sort(questions: RatedQuestion[], by: Sort): RatedQuestion[] {
  // 세 정렬 모두 같은 값이 수두룩하다. Array.sort 가 안정 정렬이라
  // 같은 값끼리는 원래 순서(저장소·파일 순)를 지킨다.
  const sorted = [...questions];
  switch (by) {
    case "level-asc":
      return sorted.sort((a, b) => a.rated.level - b.rated.level);
    case "level-desc":
      return sorted.sort((a, b) => b.rated.level - a.rated.level);
    case "hardest":
      return sorted.sort((a, b) => overlap(a) - overlap(b));
    default:
      return sorted;
  }
}
