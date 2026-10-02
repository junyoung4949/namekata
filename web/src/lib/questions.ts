import { api } from "./api";
import { getStore } from "./store";
import type { ResolvedLevel } from "./level";
import type {
  Language,
  Level,
  OtherAnswer,
  PublicQuestion,
  QuestionStats,
  ReviewRow,
  ReviewStatus,
  SubmissionResult,
} from "./types";

/**
 * 문제를 읽는 창구. 전부 서버(Spring Boot)에서 온다.
 *
 * 전에는 여기가 두 갈래였다 — NAMEKATA_API_URL 이 있으면 서버에서, 없으면
 * 추출기가 만든 data/questions.json 에서. 파일 쪽을 지운 이유:
 *
 * - 채점 규칙이 TypeScript 에 한 벌 더 있어야 했다. 같은 규칙이 Python·Java·TS
 *   세 곳에 있었고, 그중 TS 것은 파일 모드에서만 쓰였다
 * - snake_case 와 camelCase 두 모양을 번역하는 함수가 세 개 필요했다
 * - 서버 없이 화면만 만지는 길이었지만, Postgres 와 서버를 어차피 띄워 두고
 *   쓰고 있어서 실제로는 쓰이지 않았다
 */

/**
 * 문제에 등급과 집계를 얹은 것. 목록·풀이 화면이 쓴다.
 *
 * 정답과 주석은 들어 있지 않다. 목록에 쓸 일이 없고, 들고 다니면 언젠가
 * 실수로 내려간다.
 */
export type RatedQuestion = PublicQuestion & {
  stats: QuestionStats;
  rated: ResolvedLevel;
};

/**
 * 검수 전 문제까지 풀 수 있다고 안내할지.
 *
 * 걸러내는 일은 서버가 한다 (namekata.allow-pending). 이 함수는 안내 문구를
 * 띄울지만 정한다 — 두 곳에서 같은 결정을 내리면 어긋났을 때 데이터와 화면이
 * 서로 다른 말을 하게 되므로, 여기서는 데이터를 거르지 않는다.
 */
export function allowsPending(): boolean {
  const flag = process.env.NAMEKATA_ALLOW_PENDING;
  if (flag) return flag !== "0" && flag !== "false";
  return process.env.NODE_ENV !== "production";
}

// ---------------------------------------------------------------- 읽기

/** 사용자에게 보여줄 문제. 서버가 검수 상태로 걸러서 보낸다. */
export async function listPlayable(language?: Language | "all"): Promise<RatedQuestion[]> {
  const wanted = !language || language === "all" ? undefined : language;
  const [rows, stats] = await Promise.all([
    api<PublicQuestion[]>(`/questions${wanted ? `?language=${wanted}` : ""}`),
    getStore().getStats(),
  ]);
  return rows.map((row) => rate(row, stats[row.id]));
}

export async function getQuestion(id: string): Promise<RatedQuestion | null> {
  const [row, stats] = await Promise.all([
    api<PublicQuestion | null>(`/questions/${encodeURIComponent(id)}`).catch(() => null),
    getStore().getStats(),
  ]);
  return row ? rate(row, stats[row.id]) : null;
}

/** 검수 화면용. 상태와 상관없이 전부. 정답이 들어 있다. */
export async function listAll(): Promise<ReviewRow[]> {
  return api<ReviewRow[]>("/admin/questions", { admin: true });
}

/**
 * 주석만 열어 본다. 제출이 아니므로 저장하지 않는다.
 *
 * 감점은 화면이 매긴다 — "주석을 보고 맞혔다"는 사실은 사용자에게 보이는
 * 것이지 집계에 들어가지 않는다.
 */
export async function openComment(id: string): Promise<string | null> {
  const found = await api<{ docstring: string | null }>(
    `/questions/${encodeURIComponent(id)}/comment`,
  );
  return found.docstring;
}

/**
 * 답을 보고 넘어간다.
 *
 * 다른 사람들의 답을 함께 내려보낸다 — 답을 본 뒤에는 감출 이유가 없다.
 */
export async function revealAnswer(
  id: string,
): Promise<{ answer: string; answerWords: string[]; others: OtherAnswer[] } | null> {
  const result = await api<SubmissionResult>(`/questions/${encodeURIComponent(id)}/answer`);
  return { answer: result.answer, answerWords: result.answerWords, others: result.others };
}

export function countsByLanguage(questions: { language: Language }[]): Record<string, number> {
  const counts: Record<string, number> = { all: questions.length };
  for (const question of questions) {
    counts[question.language] = (counts[question.language] ?? 0) + 1;
  }
  return counts;
}

export type ReviewCounts = Record<ReviewStatus, number>;

export function countsByStatus(questions: ReviewRow[]): ReviewCounts {
  const counts: ReviewCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const question of questions) counts[question.status] += 1;
  return counts;
}

// ---------------------------------------------------------------- 등급 얹기

const NO_STATS: QuestionStats = { total: 0, partial: 0, exact: 0 };

/**
 * 등급과 집계를 얹는다.
 *
 * 서버도 같은 판단을 해서 measuredLevel 로 알려주지만, 화면은 집계를 따로
 * 받아 와서 "n명 중 m명" 같은 문구를 쓴다. 그 집계로 등급을 다시 계산해
 * 서버가 보낸 것과 맞는지 볼 필요는 없어서, 서버 값을 그대로 믿는다.
 */
function rate(row: PublicQuestion, stats?: QuestionStats): RatedQuestion {
  const own = stats ?? NO_STATS;
  return {
    ...row,
    stats: own,
    rated: { level: clampLevel(row.level), measured: row.measuredLevel },
  };
}

/** 서버는 level 을 int 로 보낸다. 화면이 쓰는 0~5 로 좁힌다. */
export function clampLevel(value: number): Level {
  return Math.min(5, Math.max(0, Math.round(value))) as Level;
}
