"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as admin from "@/lib/admin";

/**
 * 편집 화면이 부르는 서버 액션.
 *
 * 브라우저가 Spring 을 직접 부르지 않는다. 관리자 토큰이 서버에만 있어야
 * 해서다 — 액션이 서버에서 돌고, 토큰은 lib/api.ts 가 환경변수에서 꺼낸다.
 *
 * 쓰고 나면 그 자리를 다시 그린다(revalidatePath). 고친 글이 바로 보여야
 * 하고, 공개 가이드 쪽도 같이 갱신돼야 한다.
 */

function refresh(guide?: string) {
  revalidatePath("/admin");
  revalidatePath("/");
  if (guide) {
    revalidatePath(`/admin/${guide}`, "layout");
    revalidatePath(`/guide/${guide}`);
  }
}

// ---------------------------------------------------------------- 가이드

export async function createGuide(form: FormData) {
  const slug = String(form.get("slug") ?? "").trim();
  const created = await admin.createGuide({
    slug,
    language: String(form.get("language") ?? "common"),
    title: String(form.get("title") ?? "").trim(),
    lede: text(form.get("lede")),
  });
  refresh(created.slug);
  redirect(`/admin/${created.slug}`);
}

export async function saveGuide(guide: string, form: FormData) {
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
  refresh(guide);
}

export async function setPublished(guide: string, published: boolean) {
  await admin.publishGuide(guide, published);
  refresh(guide);
}

export async function removeGuide(guide: string) {
  await admin.deleteGuide(guide);
  refresh(guide);
  redirect("/admin");
}

// ---------------------------------------------------------------- 장

export async function createChapter(guide: string, form: FormData) {
  const created = await admin.addChapter(guide, {
    slug: String(form.get("slug") ?? "").trim(),
    title: String(form.get("title") ?? "").trim(),
    body: String(form.get("body") ?? ""),
  });
  refresh(guide);
  redirect(`/admin/${guide}/${created.id}`);
}

export async function saveChapter(guide: string, id: number, form: FormData) {
  await admin.editChapter(id, {
    slug: String(form.get("slug") ?? "").trim(),
    title: String(form.get("title") ?? "").trim(),
    body: String(form.get("body") ?? ""),
  });
  refresh(guide);
}

export async function moveChapter(guide: string, id: number, offset: number) {
  await admin.moveChapter(id, offset);
  refresh(guide);
}

export async function removeChapter(guide: string, id: number) {
  await admin.deleteChapter(id);
  refresh(guide);
  redirect(`/admin/${guide}`);
}

// ---------------------------------------------------------------- 문제

export async function attach(
  guide: string,
  chapterId: number,
  questionId: string,
  role: "practice" | "reference",
) {
  await admin.attachQuestion(chapterId, questionId, role);
  refresh(guide);
}

export async function detach(
  guide: string,
  chapterId: number,
  questionId: string,
  role: "practice" | "reference",
) {
  await admin.detachQuestion(chapterId, questionId, role);
  refresh(guide);
}

export async function search(query: { language?: string; kind?: string; q?: string }) {
  return admin.pickQuestions(query);
}

export async function loadNote(questionId: string) {
  return admin.getNote(questionId);
}

export async function saveNote(
  guide: string,
  questionId: string,
  body: { brief: string | null; rationale: string | null },
) {
  await admin.writeNote(questionId, body);
  refresh(guide);
}

/** 빈 칸은 빈 문자열이 아니라 null 로 보낸다 — 값의 부재는 null 이다. */
function text(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}
