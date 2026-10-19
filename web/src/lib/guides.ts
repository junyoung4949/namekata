import { api } from "./api";
import type { Language, QuestionSource } from "./types";

/**
 * 가이드를 읽는 창구. 서버의 {@code api.GuideController} 와 짝이다.
 *
 * 가이드 한 권이 한 번에 내려온다. 가로로 넘기는 화면이라 장마다 요청하면
 * 넘길 때마다 기다리게 된다.
 */

/** 가이드가 다루는 언어. 문제와 달리 "공통" 이 있다 (치트시트처럼 언어를 안 가리는 글). */
export type GuideLanguage = Language | "common";

/** 원문 표기. 번역이 아닌 자작 가이드면 null 이다. */
export type SourceCredit = {
  title: string | null;
  url: string | null;
  license: string | null;
};

export type GuideCard = {
  slug: string;
  language: GuideLanguage;
  title: string;
  lede: string | null;
  source: SourceCredit | null;
};

/** 장에 붙은 연습 문제. 정답은 들어 있지 않다. */
export type PracticeQuestion = {
  id: string;
  language: Language;
  kind: string;
  maskedCode: string;
  placeholder: string;
  owner: string | null;
  /** 이 함수가 하는 일. 문제를 풀기 전부터 보여 준다. */
  brief: string | null;
  answerLength: number;
  /** 사람이 쓴 문제에는 표기할 원문이 없다. 그때 null 이다. */
  source: QuestionSource | null;
};

export type Chapter = {
  slug: string;
  position: number;
  title: string;
  /** 마크다운. 코드 펜스는 서버에서 highlight.ts 로 보낸다 (lib/chapter.ts). */
  body: string;
  practice: PracticeQuestion[];
};

export type Guide = {
  guide: GuideCard;
  chapters: Chapter[];
};

export async function listGuides(): Promise<GuideCard[]> {
  return api<GuideCard[]>("/guides");
}

export async function getGuide(slug: string): Promise<Guide | null> {
  return api<Guide>(`/guides/${encodeURIComponent(slug)}`).catch(() => null);
}

const LABEL: Record<GuideLanguage, string> = {
  common: "공통",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
};

export function languageLabel(language: GuideLanguage): string {
  return LABEL[language] ?? language;
}
