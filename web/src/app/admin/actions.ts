"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as admin from "@/lib/admin";
import { ApiError } from "@/lib/api";

/**
 * 편집 화면이 부르는 서버 액션.
 *
 * 브라우저가 Spring 을 직접 부르지 않는다. 관리자 토큰이 서버에만 있어야
 * 해서다 — 액션이 서버에서 돌고, 토큰은 lib/api.ts 가 환경변수에서 꺼낸다.
 *
 * **실패를 던지지 않고 돌려준다.** 던지면 Next 가 오류 화면으로 덮어서,
 * 글을 쓰던 사람은 자기가 친 것을 잃고 무엇이 잘못됐는지도 모른다. slug 가
 * 겹치는 것 같은 흔한 일에 그러면 못 쓴다.
 */
export type ActionResult = { error?: string; savedAt?: number };

const OK: ActionResult = {};

function refresh(guide?: string, chapterId?: number) {
  revalidatePath("/admin");
  revalidatePath("/");
  if (guide) {
    revalidatePath(`/admin/${guide}`);
    revalidatePath(`/guide/${guide}`);
    // 장 화면은 한 단계 더 깊어서 따로 적어 줘야 한다.
    if (chapterId !== undefined) revalidatePath(`/admin/${guide}/${chapterId}`);
  }
}

/** 서버가 돌려준 상태를 사람이 읽을 말로. */
function why(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return "같은 이름(slug)이 이미 있습니다. 다른 이름을 쓰세요.";
    if (error.status === 404) return "찾을 수 없습니다. 이미 지워졌을 수 있습니다.";
    if (error.status === 400) return "빠뜨린 칸이 있습니다.";
    if (error.status === 401) return "관리자 토큰이 맞지 않습니다.";
    return `저장하지 못했습니다 (${error.status}).`;
  }
  return "저장하지 못했습니다. 서버가 응답하지 않습니다.";
}

// ---------------------------------------------------------------- 가이드

export async function createGuide(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  let slug: string;
  try {
    const created = await admin.createGuide({
      slug: String(form.get("slug") ?? "").trim(),
      language: String(form.get("language") ?? "common"),
      title: String(form.get("title") ?? "").trim(),
      lede: text(form.get("lede")),
    });
    slug = created.slug;
  } catch (error) {
    return { error: why(error) };
  }
  refresh(slug);
  // redirect 는 try 바깥에서. 안에서 부르면 그 신호를 catch 가 집어삼킨다.
  redirect(`/admin/${slug}`);
}

export async function saveGuide(
  guide: string,
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  try {
    await admin.editGuide(guide, {
      language: String(form.get("language") ?? "common"),
      title: String(form.get("title") ?? "").trim(),
      lede: text(form.get("lede")),
    });
    await admin.creditGuide(guide, {
      title: text(form.get("sourceTitle")),
      url: text(form.get("sourceUrl")),
      license: text(form.get("sourceLicense")),
    });
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide);
  return { savedAt: Date.now() };
}

export async function setPublished(guide: string, published: boolean): Promise<ActionResult> {
  try {
    await admin.publishGuide(guide, published);
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide);
  return OK;
}

export async function removeGuide(guide: string): Promise<ActionResult> {
  try {
    await admin.deleteGuide(guide);
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide);
  redirect("/admin");
}

// ---------------------------------------------------------------- 장

export async function createChapter(
  guide: string,
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  let id: number;
  try {
    const created = await admin.addChapter(guide, {
      slug: String(form.get("slug") ?? "").trim(),
      title: String(form.get("title") ?? "").trim(),
      body: String(form.get("body") ?? ""),
    });
    id = created.id;
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide);
  redirect(`/admin/${guide}/${id}`);
}

export async function saveChapter(
  guide: string,
  id: number,
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  try {
    await admin.editChapter(id, {
      slug: String(form.get("slug") ?? "").trim(),
      title: String(form.get("title") ?? "").trim(),
      body: String(form.get("body") ?? ""),
    });
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide, id);
  return { savedAt: Date.now() };
}

export async function moveChapter(
  guide: string,
  id: number,
  offset: number,
): Promise<ActionResult> {
  try {
    await admin.moveChapter(id, offset);
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide, id);
  return OK;
}

export async function removeChapter(guide: string, id: number): Promise<ActionResult> {
  try {
    await admin.deleteChapter(id);
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide, id);
  redirect(`/admin/${guide}`);
}

// ---------------------------------------------------------------- 문제

export async function attach(
  guide: string,
  chapterId: number,
  questionId: string,
  role: "practice" | "reference",
): Promise<ActionResult> {
  try {
    await admin.attachQuestion(chapterId, questionId, role);
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide, chapterId);
  return OK;
}

export async function detach(
  guide: string,
  chapterId: number,
  questionId: string,
  role: "practice" | "reference",
): Promise<ActionResult> {
  try {
    await admin.detachQuestion(chapterId, questionId, role);
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide, chapterId);
  return OK;
}

/**
 * 문제를 새로 만들어 장에 붙인다.
 *
 * 가리는 일은 서버가 한다. 답이 코드에 없거나 가린 뒤에도 보이면 400 이
 * 오는데, 그 메시지를 그대로 보여 준다 — "코드에서 'hasText' 를 찾지
 * 못했다" 는 사람이 읽고 바로 고칠 수 있는 말이다.
 */
export async function writeQuestion(
  guide: string,
  chapterId: number,
  body: {
    language: string;
    kind: string;
    answer: string;
    code: string;
    owner: string | null;
    docstring: string | null;
  },
): Promise<ActionResult> {
  try {
    await admin.writeQuestion({ ...body, chapterId });
  } catch (error) {
    // 가리기 실패는 400 이고, 서버가 이유를 적어 보낸다. 그걸 보여 준다.
    if (error instanceof ApiError && error.status === 400) {
      return { error: "코드에서 답을 찾지 못했거나, 가린 뒤에도 답이 보입니다." };
    }
    return { error: why(error) };
  }
  refresh(guide, chapterId);
  return { savedAt: Date.now() };
}

export async function removeQuestion(
  guide: string,
  chapterId: number,
  questionId: string,
): Promise<ActionResult> {
  try {
    await admin.deleteQuestion(questionId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return { error: "추출기가 가져온 문제는 여기서 지울 수 없습니다. 떼기만 하세요." };
    }
    return { error: why(error) };
  }
  refresh(guide, chapterId);
  return OK;
}

export async function search(query: { language?: string; kind?: string; q?: string }) {
  return admin.pickQuestions(query);
}

export async function loadNote(questionId: string) {
  return admin.getNote(questionId);
}

export async function saveNote(
  guide: string,
  chapterId: number,
  questionId: string,
  body: { brief: string | null; rationale: string | null },
): Promise<ActionResult> {
  try {
    await admin.writeNote(questionId, body);
  } catch (error) {
    return { error: why(error) };
  }
  refresh(guide, chapterId);
  return { savedAt: Date.now() };
}

/** 빈 칸은 빈 문자열이 아니라 null 로 보낸다 — 값의 부재는 null 이다. */
function text(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}
