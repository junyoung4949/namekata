import "server-only";
import { highlight, type Highlighted } from "./highlight";
import type { Language } from "./types";

/**
 * 장 본문을 그릴 수 있는 조각으로 나눈다.
 *
 * 본문은 마크다운인데, 그 안의 코드 펜스만 다르게 다뤄야 한다. 문제 화면과
 * 같은 IDE 배색으로 그리려면 shiki 토큰화를 거쳐야 하고, 그건 서버에서만
 * 할 수 있는 일(`server-only`)이자 비동기다. 마크다운 렌더러는 동기로
 * 도므로 그 안에서는 부를 수 없다.
 *
 * 그래서 서버에서 먼저 펜스를 떼어 내 토큰화해 두고, 남은 산문만 렌더러에
 * 넘긴다. 결과적으로 본문의 예시 코드도 연습 문제와 똑같이 보인다 —
 * 줄 번호, 괄호 쌍 색칠, 들여쓰기 가이드까지.
 */

export type ChapterPart =
  | { kind: "prose"; text: string }
  | { kind: "code"; language: Language; highlighted: Highlighted };

/** shiki 로 보낼 수 있는 언어인지. 아니면 산문(그냥 코드 블록)으로 둔다. */
const SUPPORTED: Language[] = ["java", "python", "javascript"];

const FENCE = /^```([\w+-]*)[ \t]*\n([\s\S]*?)\n?^```[ \t]*$/gm;

export async function splitChapter(body: string): Promise<ChapterPart[]> {
  const parts: ChapterPart[] = [];
  let at = 0;

  for (const match of body.matchAll(FENCE)) {
    const [whole, rawLang, code] = match;
    const start = match.index ?? 0;

    const before = body.slice(at, start);
    if (before.trim()) parts.push({ kind: "prose", text: before });
    at = start + whole.length;

    const language = normalize(rawLang);
    if (language) {
      parts.push({ kind: "code", language, highlighted: await highlight(code, language) });
    } else {
      // 모르는 언어는 마크다운에 그대로 돌려준다. 펜스를 다시 씌워서
      // 렌더러가 코드 블록으로 알아보게 한다.
      parts.push({ kind: "prose", text: whole });
    }
  }

  const rest = body.slice(at);
  if (rest.trim()) parts.push({ kind: "prose", text: rest });

  return parts;
}

function normalize(raw: string): Language | null {
  const lower = raw.toLowerCase();
  const alias = lower === "js" ? "javascript" : lower === "py" ? "python" : lower;
  return (SUPPORTED as string[]).includes(alias) ? (alias as Language) : null;
}
