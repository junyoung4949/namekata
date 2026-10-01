import { NextResponse } from "next/server";
import { openComment, revealAnswer } from "@/lib/questions";
import { getStore } from "@/lib/store";
import { isValidIdentifier } from "@/lib/scoring";

/**
 * 제출 처리.
 *
 * 채점은 저장소가 한다. 전에는 이 라우트가 matchWords 로 채점해서 결과를
 * 함께 저장했는데, 그러면 브라우저가 보낸 값을 그대로 믿는 경로가 열린다.
 * 집계는 난이도가 되고 난이도는 목록 정렬에 쓰이므로 아무나 흔들 수 있었다.
 *
 * 여기 남은 검사(isValidIdentifier)는 서버에 가기 전에 거르는 것일 뿐이다.
 * 서버도 같은 검사를 한다 — 이 라우트를 건너뛰고 부를 수 있으니까.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { questionId?: string; name?: string };
  const questionId = body.questionId?.trim();
  const name = body.name?.trim();

  if (!questionId || !name || !isValidIdentifier(name)) {
    return NextResponse.json({ error: "invalid submission" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getStore().submit(questionId, name));
  } catch {
    return NextResponse.json({ error: "unknown question" }, { status: 404 });
  }
}

/**
 * 제출하지 않고 열어보는 것들. 둘 다 눌러서 여는 것이라 POST와 따로 둔다.
 *
 * - `comment=1`: 원본 주석
 * - `answer=1`: 원본 이름 (답을 보고 넘어가기)
 *
 * 답만 보고 넘어간 것은 제출이 아니므로 저장하지 않는다. 다른 사람들의
 * 답은 함께 내려보낸다 — 답을 본 뒤에는 감출 이유가 없다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("questionId");
  const wantsComment = searchParams.get("comment") === "1";
  const wantsAnswer = searchParams.get("answer") === "1";

  if (!questionId || (!wantsComment && !wantsAnswer)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    if (wantsAnswer) {
      const revealed = await revealAnswer(questionId);
      if (!revealed) return NextResponse.json({ error: "unknown question" }, { status: 404 });
      return NextResponse.json(revealed);
    }
    return NextResponse.json({ docstring: await openComment(questionId) });
  } catch {
    return NextResponse.json({ error: "unknown question" }, { status: 404 });
  }
}
