/**
 * 줄 앞 공백 계산.
 *
 * 문법 강조(서버)와 되살린 주석(클라이언트)이 같은 규칙으로 들여쓰기
 * 가이드를 그려야 해서 여기 모아 둔다.
 */

export const TAB_WIDTH = 4;

/** 탭을 펼친 앞 공백 너비. */
export function visualIndent(line: string): number {
  let width = 0;
  for (const ch of line) {
    if (ch === "\t") width += TAB_WIDTH - (width % TAB_WIDTH);
    else if (ch === " ") width += 1;
    else break;
  }
  return width;
}

/** 앞 공백 너비를 가이드 개수와 가이드로 떨어지지 않는 나머지 공백으로 나눈다. */
export function splitIndent(width: number, unit: number) {
  return {
    guides: Math.floor(width / unit),
    indentRest: " ".repeat(width % unit),
  };
}
