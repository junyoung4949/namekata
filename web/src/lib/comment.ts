import { splitIndent, visualIndent } from "./indent";
import type { Language } from "./types";

/**
 * 원본 주석을 제자리에 되살린다.
 *
 * 추출기는 문제를 만들 때 주석을 떼어내 따로 보관한다
 * (tools/extract/extract.py 의 mask). 주석 보기를 누르면 그 주석을 다시
 * 코드 안에, 원래 있던 자리에 끼워 넣는다. 주석 기호도 언어에 맞게
 * 되돌려서 코드에서 읽던 모습 그대로 보이게 한다.
 *
 * 문법 강조는 서버에서만 하므로(lib/highlight.ts) 여기서는 토큰화하지
 * 않는다. 주석 한 덩어리는 색이 하나라서 강조가 필요 없다.
 */

export type CommentLine = {
  /** 이 줄 앞에 그릴 들여쓰기 가이드 개수 */
  guides: number;
  /** 가이드 한 칸으로 떨어지지 않는 나머지 앞 공백 */
  indentRest: string;
  /** 앞 공백을 뗀 주석 본문 */
  text: string;
};

export type CommentBlock = {
  /** 코드의 이 줄 앞에 끼워 넣는다 */
  at: number;
  /** 주석을 지우고 남아 있던 빈 줄 수 (그 자리를 주석으로 되돌린다) */
  replace: number;
  lines: CommentLine[];
};

/**
 * 주석이 있던 자리.
 *
 * 추출기가 어디서 주석을 떼어냈는지에 맞춘다.
 * - Python: docstring 은 함수 본문의 첫 문장이므로 def 헤더 다음 줄
 *   (헤더가 여러 줄로 감긴 경우가 있어 `:` 로 끝나는 줄을 찾는다)
 * - Java·JS: Javadoc·JSDoc 은 함수 바깥 위쪽이므로 첫 줄 앞
 *
 * 떼어낸 자리에는 빈 줄 하나가 남아 있다(_tidy). 그 줄을 주석으로 바꿔
 * 넣으면 원본과 같은 모양이 된다.
 */
function anchor(lines: string[], language: Language): { at: number; replace: number } {
  let at = 0;
  if (language === "python") {
    const header = lines.findIndex((line) => line.trimEnd().endsWith(":"));
    at = header < 0 ? 1 : header + 1;
  }
  return { at, replace: lines[at]?.trim() === "" ? 1 : 0 };
}

/** 주석이 있던 자리의 들여쓰기. 그 자리에 이어지는 코드 줄에서 가져온다. */
function indentAt(lines: string[], from: number, fallback: number): string {
  for (let i = from; i < lines.length; i++) {
    if (lines[i].trim()) return lines[i].slice(0, lines[i].length - lines[i].trimStart().length);
  }
  return " ".repeat(fallback);
}

/**
 * 보관해 둔 주석 본문을 줄 단위로 편다.
 *
 * 추출기가 주석 기호만 걷어내므로 둘째 줄부터는 원본 들여쓰기가 남아
 * 있다(_clean_doc). 되살릴 자리의 들여쓰기는 따로 붙이니 여기서 걷는다.
 */
function dedent(text: string): string[] {
  const lines = text.split("\n");
  const rest = lines.slice(1).filter((line) => line.trim());
  if (rest.length === 0) return lines;
  const common = Math.min(...rest.map((line) => line.length - line.trimStart().length));
  return [lines[0], ...lines.slice(1).map((line) => (line.trim() ? line.slice(common) : ""))];
}

/** 언어의 주석 기호를 돌려놓는다. */
function wrap(body: string[], language: Language): string[] {
  if (language === "python") {
    if (body.length === 1) return [`"""${body[0]}"""`];
    return [`"""${body[0]}`, ...body.slice(1), `"""`];
  }
  return ["/**", ...body.map((line) => (line ? ` * ${line}` : " *")), " */"];
}

export function buildCommentBlock(
  code: string,
  language: Language,
  text: string,
  indentUnit: number,
): CommentBlock | null {
  const body = dedent(text.trim());
  if (body.length === 0) return null;

  const lines = code.split("\n");
  const { at, replace } = anchor(lines, language);
  const indent = indentAt(lines, at + replace, language === "python" ? indentUnit : 0);
  const width = visualIndent(indent);

  return {
    at,
    replace,
    lines: wrap(body, language).map((line) => ({
      ...splitIndent(width, indentUnit),
      text: line,
    })),
  };
}
