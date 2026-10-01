import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

/** 장난·욕설 답 신고. 숨기는 건 관리자가 검수 화면에서 한다. */
export async function POST(request: Request) {
  const body = (await request.json()) as { questionId?: string; name?: string };
  const questionId = body.questionId?.trim();
  const name = body.name?.trim();

  if (!questionId || !name) {
    return NextResponse.json({ error: "invalid report" }, { status: 400 });
  }

  await getStore().report(questionId, name);
  return NextResponse.json({ ok: true });
}
