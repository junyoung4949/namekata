import { NextResponse } from "next/server";
import { revealAnswer } from "@/lib/questions";
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
 * 답을 보고 넘어간다. 제출이 아니므로 저장하지 않는다.
 *
 * 전에는 `comment=1` 로 원본 주석을 여는 길도 있었다. 감점을 받고 여는
 * 힌트였는데, 상황 설명을 처음부터 보여 주기로 하면서 없앴다.
 */
export async function GET(request: Request) {
  const questionId = new URL(request.url).searchParams.get("questionId");
  if (!questionId) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const revealed = await revealAnswer(questionId);
    if (!revealed) return NextResponse.json({ error: "unknown question" }, { status: 404 });
    return NextResponse.json(revealed);
  } catch {
    return NextResponse.json({ error: "unknown question" }, { status: 404 });
  }
}
