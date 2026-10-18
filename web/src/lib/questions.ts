import { api } from "./api";
import type { Language, PublicQuestion, SubmissionResult } from "./types";

/**
 * 문제를 읽는 창구. 전부 서버(Spring Boot)에서 온다.
 *
 * 전에는 문제에 등급과 집계를 얹어 내보냈다 (RatedQuestion). 목록 화면이
 * 레벨로 거르고 겹침률을 보여 줬기 때문인데, 가이드 중심으로 바뀌면서 둘 다
 * 사라졌다 — 이제 어떤 문제를 보여줄지는 사용자가 필터로 고르지 않고 가이드
 * 저자가 장마다 고른다. 검수 단계도 같은 이유로 없앴다: 장에 붙이는 행위가
 * 곧 승인이라, 승인 단계를 따로 두면 같은 판단을 두 번 하게 된다.
 */

/** 살아 있는 문제 전부. 내려간 것(retired)만 빠진다. */
export async function listQuestions(language?: Language | "all"): Promise<PublicQuestion[]> {
  const wanted = !language || language === "all" ? undefined : language;
  return api<PublicQuestion[]>(`/questions${wanted ? `?language=${wanted}` : ""}`);
}

export async function getQuestion(id: string): Promise<PublicQuestion | null> {
  return api<PublicQuestion>(`/questions/${encodeURIComponent(id)}`).catch(() => null);
}

/** 답을 보고 넘어간다. 제출이 아니므로 저장하지 않는다. */
export async function revealAnswer(id: string): Promise<SubmissionResult> {
  return api<SubmissionResult>(`/questions/${encodeURIComponent(id)}/answer`);
}

export function countsByLanguage(questions: { language: Language }[]): Record<string, number> {
  const counts: Record<string, number> = { all: questions.length };
  for (const question of questions) {
    counts[question.language] = (counts[question.language] ?? 0) + 1;
  }
  return counts;
}

