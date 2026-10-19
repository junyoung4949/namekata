import "server-only";
import { api } from "./api";
import type { GuideLanguage } from "./guides";

/**
 * 가이드를 쓰는 창구. 서버의 {@code api.GuideAdminController} 와 짝이다.
 *
 * server-only 다. 관리자 토큰이 서버 환경변수에만 있어야 하기 때문이고
 * (lib/api.ts), 브라우저에서는 서버 액션을 거쳐 여기로 온다
 * (app/admin/actions.ts).
 *
 * 공개 쪽(lib/guides.ts)과 모양이 다르다. 여기는 초안까지 전부 보이고
 * 문제에는 정답이 들어 있다 — 어느 문제를 어느 장에 붙일지 고르려면
 * 답을 봐야 한다.
 */

export type GuideRow = {
  slug: string;
  language: GuideLanguage;
  title: string;
  lede: string | null;
  position: number;
  status: "draft" | "published";
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceLicense: string | null;
};

/** 장에 붙은 문제. ready 는 상황 설명(brief)을 썼는지. */
export type Attached = {
  questionId: string;
  role: "practice" | "reference";
  position: number;
  answer: string;
  owner: string | null;
  ready: boolean;
};

export type ChapterRow = {
  id: number;
  slug: string;
  position: number;
  title: string;
  body: string;
  questions: Attached[];
};

/** 붙일 문제를 고르는 목록. 정답이 들어 있다. */
export type QuestionRow = {
  id: string;
  language: string;
  kind: string;
  answer: string;
  owner: string | null;
  repo: string;
  docstring: string | null;
  maskedCode: string;
  /** extracted: 추출기가 가져온 것 · authored: 사람이 쓴 것 */
  origin: "extracted" | "authored";
  ready: boolean;
};

export type NoteRow = {
  questionId: string;
  brief: string | null;
  rationale: string | null;
};

const admin = { admin: true } as const;
const slug = encodeURIComponent;

// ---------------------------------------------------------------- 가이드

export function listGuides(): Promise<GuideRow[]> {
  return api<GuideRow[]>("/admin/guides", admin);
}

export function getGuide(guide: string): Promise<GuideRow | null> {
  return listGuides().then((rows) => rows.find((row) => row.slug === guide) ?? null);
}

export function createGuide(body: {
  slug: string;
  language: string;
  title: string;
  lede: string | null;
}): Promise<GuideRow> {
  return api<GuideRow>("/admin/guides", { ...admin, method: "POST", body });
}

export function editGuide(
  guide: string,
  body: { language: string; title: string; lede: string | null; position?: number },
): Promise<GuideRow> {
  return api<GuideRow>(`/admin/guides/${slug(guide)}`, { ...admin, method: "POST", body });
}

export function creditGuide(
  guide: string,
  body: { title: string | null; url: string | null; license: string | null },
): Promise<GuideRow> {
  return api<GuideRow>(`/admin/guides/${slug(guide)}/source`, { ...admin, method: "POST", body });
}

export function publishGuide(guide: string, published: boolean): Promise<GuideRow> {
  return api<GuideRow>(`/admin/guides/${slug(guide)}/publish`, {
    ...admin,
    method: "POST",
    body: { published },
  });
}

export function deleteGuide(guide: string): Promise<void> {
  return api<void>(`/admin/guides/${slug(guide)}`, { ...admin, method: "DELETE" });
}

// ---------------------------------------------------------------- 장

export function listChapters(guide: string): Promise<ChapterRow[]> {
  return api<ChapterRow[]>(`/admin/guides/${slug(guide)}/chapters`, admin);
}

export function addChapter(
  guide: string,
  body: { slug: string; title: string; body: string },
): Promise<ChapterRow> {
  return api<ChapterRow>(`/admin/guides/${slug(guide)}/chapters`, {
    ...admin,
    method: "POST",
    body,
  });
}

export function editChapter(
  id: number,
  body: { slug: string; title: string; body: string },
): Promise<ChapterRow> {
  return api<ChapterRow>(`/admin/chapters/${id}`, { ...admin, method: "POST", body });
}

/** 한 칸 올리거나 내린다. 순서 숫자는 서버가 매긴다. */
export function moveChapter(id: number, offset: number): Promise<ChapterRow[]> {
  return api<ChapterRow[]>(`/admin/chapters/${id}/move`, {
    ...admin,
    method: "POST",
    body: { offset },
  });
}

export function deleteChapter(id: number): Promise<void> {
  return api<void>(`/admin/chapters/${id}`, { ...admin, method: "DELETE" });
}

// ---------------------------------------------------------------- 문제

export function pickQuestions(query: {
  language?: string;
  kind?: string;
  q?: string;
}): Promise<QuestionRow[]> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) search.set(key, value);
  }
  const tail = search.toString();
  return api<QuestionRow[]>(`/admin/questions${tail ? `?${tail}` : ""}`, admin);
}

export function attachQuestion(
  chapterId: number,
  questionId: string,
  role: "practice" | "reference",
): Promise<void> {
  return api<void>(`/admin/chapters/${chapterId}/questions`, {
    ...admin,
    method: "POST",
    body: { questionId, role },
  });
}

/** 연습 문제를 목록에서 한 칸 옮긴다. 장을 넘으면 그 장의 것이 된다. */
export function moveQuestion(
  chapterId: number,
  questionId: string,
  offset: number,
): Promise<void> {
  return api<void>(`/admin/chapters/${chapterId}/questions/${slug(questionId)}/move`, {
    ...admin,
    method: "POST",
    body: { offset },
  });
}

export function detachQuestion(
  chapterId: number,
  questionId: string,
  role: "practice" | "reference",
): Promise<void> {
  return api<void>(
    `/admin/chapters/${chapterId}/questions/${slug(questionId)}?role=${role}`,
    { ...admin, method: "DELETE" },
  );
}

/**
 * 문제를 새로 만든다. 가리는 일은 서버가 한다 — 화면이 하면 같은 규칙이 두
 * 곳에 생기고, 가린 결과를 그대로 믿는 길이 열린다.
 */
export function writeQuestion(body: {
  chapterId: number | null;
  language: string;
  kind: string;
  answer: string;
  code: string;
  owner: string | null;
  docstring: string | null;
}): Promise<QuestionRow> {
  return api<QuestionRow>("/admin/questions", { ...admin, method: "POST", body });
}

export function deleteQuestion(questionId: string): Promise<void> {
  return api<void>(`/admin/questions/${slug(questionId)}`, { ...admin, method: "DELETE" });
}

export function getNote(questionId: string): Promise<NoteRow> {
  return api<NoteRow>(`/admin/questions/${slug(questionId)}/note`, admin);
}

export function writeNote(
  questionId: string,
  body: { brief: string | null; rationale: string | null },
): Promise<NoteRow> {
  return api<NoteRow>(`/admin/questions/${slug(questionId)}/note`, {
    ...admin,
    method: "POST",
    body,
  });
}
