import { api } from "./api";
import type { Language, PublicQuestion, ReviewRow, ReviewStatus, SubmissionResult } from "./types";

/**
 * 문제를 읽는 창구. 전부 서버(Spring Boot)에서 온다.
 *
 * 전에는 문제에 등급과 집계를 얹어 내보냈다 (RatedQuestion). 목록 화면이
 * 레벨로 거르고 겹침률을 보여 줬기 때문인데, 가이드 중심으로 바뀌면서 둘 다
 * 사라졌다 — 이제 어떤 문제를 보여줄지는 사용자가 필터로 고르지 않고 가이드
 * 저자가 장마다 고른다.
 */

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
export async function listPlayable(language?: Language | "all"): Promise<PublicQuestion[]> {
  const wanted = !language || language === "all" ? undefined : language;
  return api<PublicQuestion[]>(`/questions${wanted ? `?language=${wanted}` : ""}`);
}

export async function getQuestion(id: string): Promise<PublicQuestion | null> {
  return api<PublicQuestion>(`/questions/${encodeURIComponent(id)}`).catch(() => null);
}

/** 검수 화면용. 상태와 상관없이 전부. 정답이 들어 있다. */
export async function listAll(): Promise<ReviewRow[]> {
  return api<ReviewRow[]>("/admin/questions", { admin: true });
}

/** 답을 보고 넘어간다. 제출이 아니므로 저장하지 않는다. */
export async function revealAnswer(
  id: string,
): Promise<{ answer: string; answerWords: string[] } | null> {
  const result = await api<SubmissionResult>(`/questions/${encodeURIComponent(id)}/answer`);
  return { answer: result.answer, answerWords: result.answerWords };
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
