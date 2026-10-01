import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { ReviewStatus } from "@/lib/types";

/**
 * 검수 동작 (승인/거부/답 숨기기).
 *
 * NAMEKATA_ADMIN_TOKEN 이 있으면 x-admin-token 헤더로 맞춰야 한다.
 * 토큰이 없으면 개발 환경에서만 열어 둔다. 배포 전에 반드시 설정할 것.
 */
function authorize(request: Request): boolean {
  const expected = process.env.NAMEKATA_ADMIN_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-admin-token") === expected;
}

type Action =
  | { action: "review"; questionId: string; status: ReviewStatus }
  | { action: "hide"; questionId: string; name: string };

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<Action>;
  const store = getStore();

  if (body.action === "review" && body.questionId && body.status) {
    await store.setReview(body.questionId, body.status);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "hide" && body.questionId && body.name) {
    await store.hideAnswer(body.questionId, body.name);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
