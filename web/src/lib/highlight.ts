import "server-only";
import { createHighlighterCore, type HighlighterCore, type ThemedToken } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { splitIndent, visualIndent } from "./indent";
import { darcula, intellijLight } from "./themes/intellij";
import type { Language } from "./types";

/**
 * 문법 강조.
 *
 * 언어마다 그 언어를 실제로 쓰는 에디터의 배색을 쓴다.
 * Java는 IntelliJ(Darcula / IntelliJ Light), Python·JS는 VS Code 기본
 * 테마(Dark+ / Light+)다.
 *
 * 토큰화는 서버에서만 한다. 코드 화면은 클라이언트 컴포넌트지만,
 * shiki 문법 파일을 브라우저로 내려보낼 이유가 없다. 토큰만 넘긴다.
 *
 * 밝은 테마와 어두운 테마를 한 번에 뽑는다. `defaultColor: false` 를 줘서
 * 두 색 모두 `--shiki-light` / `--shiki-dark` 변수로만 나오게 한다.
 * 인라인 `color`를 심으면 다크 모드 CSS 규칙이 인라인 스타일에 져서
 * 밝은 테마 색이 어두운 배경에 그대로 찍힌다. 전환은 CSS가 한다
 * (globals.css의 prefers-color-scheme 규칙).
 *
 * 문법 강조 위에 에디터 흉내를 두 가지 더 얹는다. 둘 다 코드를 해석하지
 * 않고 글자만 보면 되는 것들이다.
 *
 * - 괄호 쌍 색칠: 중첩 깊이에 따라 색을 돌린다
 * - 들여쓰기 가이드: 들여쓰기 단계마다 세로선을 긋는다
 */

export type Token = {
  content: string;
  /** --shiki-light / --shiki-dark 를 담은 인라인 스타일 */
  style: Record<string, string>;
  /** 괄호 쌍 색칠 단계 (0~2 순환). 괄호 토큰에만 붙는다. */
  bracket?: number;
};

export type HighlightedLine = {
  /** 이 줄 앞에 그릴 들여쓰기 가이드 개수 */
  guides: number;
  /** 가이드 한 칸으로 떨어지지 않는 나머지 앞 공백 */
  indentRest: string;
  tokens: Token[];
};

type Pair = { light: string; dark: string };

/** 코드 블록이 에디터처럼 보이도록 쓰는 색. 밝은 쪽과 어두운 쪽을 함께 넘긴다. */
export type EditorColors = {
  background: Pair;
  gutterBackground: Pair;
  gutterForeground: Pair;
  indentGuide: Pair;
  /** 괄호 쌍 색칠에 돌려 쓸 색 세 개 */
  brackets: { light: string[]; dark: string[] };
  /** 답을 공개했을 때 빈칸에 쓸 색 (각 에디터의 함수 선언 색) */
  declaration: Pair;
  /** 되살린 원본 주석에 쓸 색 (readDocStyle 참고) */
  doc: DocStyle;
};

/** 원본 주석을 되살릴 때 쓸 글자 모양. 테마가 그 토큰에 쓰는 값 그대로다. */
export type DocStyle = Pair & { italic: boolean };

export type Highlighted = {
  lines: HighlightedLine[];
  /** 들여쓰기 한 단계의 너비 (글자 수) */
  indentUnit: number;
  colors: EditorColors;
};

type ThemePair = {
  light: string;
  dark: string;
  declaration: Pair;
};

/**
 * 언어별 테마.
 *
 * declaration 은 각 테마가 함수 이름에 쓰는 색이다. 문제에서 메서드 선언
 * 이름은 항상 가려져 있어 테마가 칠할 기회가 없으므로, 답을 공개할 때
 * 이 색을 직접 준다.
 */
const THEMES: Record<Language, ThemePair> = {
  java: {
    light: "intellij-light",
    dark: "intellij-darcula",
    declaration: { light: "#00627A", dark: "#FFC66D" },
  },
  python: {
    light: "light-plus",
    dark: "dark-plus",
    declaration: { light: "#795E26", dark: "#DCDCAA" },
  },
  javascript: {
    light: "light-plus",
    dark: "dark-plus",
    declaration: { light: "#795E26", dark: "#DCDCAA" },
  },
};

/**
 * 괄호 쌍 색칠에 쓸 색.
 *
 * VS Code 기본값이다. 테마 파일에는 들어 있지 않아 여기 적어 둔다.
 * IntelliJ는 괄호 쌍 색칠이 기본 기능이 아니라 맞출 원본이 없으므로,
 * Java에도 같은 색을 쓴다.
 */
const BRACKET_COLORS = {
  light: ["#0431FA", "#319331", "#7B3814"],
  dark: ["#FFD700", "#DA70D6", "#179FFF"],
};

/**
 * 테마가 값을 들고 있지 않을 때 쓸 색.
 *
 * shiki가 싣는 VS Code 테마(light-plus / dark-plus)에는 거터 색이 빠져 있다.
 * 여기 값은 VS Code가 실제로 쓰는 줄 번호 색이고, 거터 배경은 VS Code와
 * 마찬가지로 에디터 배경을 그대로 쓴다 (readColors 참고).
 */
const FALLBACK: EditorColors = {
  background: { light: "#ffffff", dark: "#1e1e1e" },
  gutterBackground: { light: "#ffffff", dark: "#1e1e1e" },
  gutterForeground: { light: "#237893", dark: "#858585" },
  indentGuide: { light: "#d3d3d3", dark: "#404040" },
  brackets: BRACKET_COLORS,
  declaration: { light: "#795E26", dark: "#DCDCAA" },
  doc: { light: "#008000", dark: "#6A9955", italic: false },
};

/**
 * 되살린 주석이 원래 어떤 토큰이었는지.
 *
 * 주석 보기는 지워둔 원본 주석을 제자리에 다시 넣는 것이므로, 색도 그
 * 자리에 원래 칠했을 색을 쓴다. Python의 docstring은 주석이 아니라
 * 문자열이라서 문자열 색으로 간다.
 */
const DOC_SCOPES: Record<Language, string[]> = {
  java: ["comment.block.documentation", "comment"],
  javascript: ["comment.block.documentation", "comment"],
  python: ["string.quoted.docstring", "string"],
};

const OPEN = "([{";
const CLOSE = ")]}";

// 필요한 문법 세 개와 테마 네 개만 싣는다.
let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [
      intellijLight,
      darcula,
      import("shiki/themes/light-plus.mjs"),
      import("shiki/themes/dark-plus.mjs"),
    ],
    langs: [
      import("shiki/langs/java.mjs"),
      import("shiki/langs/python.mjs"),
      import("shiki/langs/javascript.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}

/**
 * 테마가 특정 스코프에 주는 글자 설정. 앞에 적은 스코프를 먼저 찾는다.
 * (테마마다 스코프를 하나씩 또는 배열로 적는다.)
 */
function readScope(highlighter: HighlighterCore, theme: string, scopes: string[]) {
  const settings = highlighter.getTheme(theme).settings ?? [];
  for (const scope of scopes) {
    for (const entry of settings) {
      const list = typeof entry.scope === "string" ? [entry.scope] : (entry.scope ?? []);
      if (list.includes(scope) && entry.settings?.foreground) return entry.settings;
    }
  }
  return undefined;
}

/** 주석을 되살릴 때 쓸 색. 기울임까지 테마가 적어둔 대로 따라간다. */
function readDocStyle(
  highlighter: HighlighterCore,
  pair: ThemePair,
  language: Language,
): DocStyle {
  const scopes = DOC_SCOPES[language] ?? DOC_SCOPES.javascript;
  const light = readScope(highlighter, pair.light, scopes);
  const dark = readScope(highlighter, pair.dark, scopes);
  return {
    light: light?.foreground ?? FALLBACK.doc.light,
    dark: dark?.foreground ?? FALLBACK.doc.dark,
    italic: (light?.fontStyle ?? "").includes("italic"),
  };
}

/** 테마가 들고 있는 에디터 색을 그대로 읽는다. 값을 따로 적어두지 않는다. */
function readColors(
  highlighter: HighlighterCore,
  pair: ThemePair,
  language: Language,
): EditorColors {
  const read = (theme: string, key: string): string | undefined =>
    (highlighter.getTheme(theme).colors ?? {})[key];

  const bg: Pair = {
    light: read(pair.light, "editor.background") ?? FALLBACK.background.light,
    dark: read(pair.dark, "editor.background") ?? FALLBACK.background.dark,
  };

  return {
    background: bg,
    gutterBackground: {
      light: read(pair.light, "editorGutter.background") ?? bg.light,
      dark: read(pair.dark, "editorGutter.background") ?? bg.dark,
    },
    gutterForeground: {
      light: read(pair.light, "editorLineNumber.foreground") ?? FALLBACK.gutterForeground.light,
      dark: read(pair.dark, "editorLineNumber.foreground") ?? FALLBACK.gutterForeground.dark,
    },
    indentGuide: {
      light: read(pair.light, "editorIndentGuide.background1") ?? FALLBACK.indentGuide.light,
      dark: read(pair.dark, "editorIndentGuide.background1") ?? FALLBACK.indentGuide.dark,
    },
    brackets: BRACKET_COLORS,
    declaration: pair.declaration,
    doc: readDocStyle(highlighter, pair, language),
  };
}

// ------------------------------------------------------------- 들여쓰기

/**
 * 들여쓰기 한 단계의 너비를 코드에서 알아낸다.
 *
 * 가장 작은 들여쓰기를 단계로 본다. 우리 문제는 함수 하나를 잘라낸 것이라
 * 첫 단계가 반드시 들어 있어서 이 방식으로 2칸·4칸·탭이 모두 맞는다.
 * 터무니없는 값이 나오면 4로 둔다.
 */
function detectIndentUnit(lines: string[]): number {
  let unit = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    const width = visualIndent(line);
    if (width > 0 && width < unit) unit = width;
  }
  return unit >= 2 && unit <= 8 ? unit : 4;
}

/**
 * 줄마다 가이드를 몇 개 그릴지.
 *
 * 빈 줄은 앞뒤 줄 중 얕은 쪽을 따라간다. 그래야 블록 한가운데의 빈 줄에서
 * 세로선이 끊기지 않는다.
 */
function computeGuides(lines: string[], unit: number) {
  const widths = lines.map((line) => (line.trim() ? visualIndent(line) : null));

  return widths.map((width, index) => {
    let resolved = width;
    if (resolved === null) {
      let prev = 0;
      let next = 0;
      for (let i = index - 1; i >= 0; i--) {
        if (widths[i] !== null) {
          prev = widths[i]!;
          break;
        }
      }
      for (let i = index + 1; i < widths.length; i++) {
        if (widths[i] !== null) {
          next = widths[i]!;
          break;
        }
      }
      resolved = Math.min(prev, next);
    }
    return splitIndent(resolved, unit);
  });
}

// ------------------------------------------------------------- 괄호

/** 문자열·주석 안에 있는 토큰인지. 그 안의 괄호는 색칠하지 않는다. */
function isLiteral(token: ThemedToken): boolean {
  return (token.explanation ?? []).some((part) =>
    part.scopes.some(
      (scope) =>
        scope.scopeName.startsWith("string") ||
        scope.scopeName.startsWith("comment") ||
        scope.scopeName.startsWith("constant.character"),
    ),
  );
}

/**
 * 토큰을 줄 단위로 다듬는다.
 *
 * - 줄 앞 공백은 떼어낸다 (가이드가 그 자리를 대신 그린다)
 * - 코드에 있는 괄호는 따로 떼어내 중첩 깊이를 붙인다
 */
function decorate(
  themed: ThemedToken[][],
  rawLines: string[],
  unit: number,
): HighlightedLine[] {
  const guides = computeGuides(rawLines, unit);
  let depth = 0;

  return themed.map((lineTokens, index) => {
    const raw = rawLines[index] ?? "";
    let toDrop = raw.length - raw.trimStart().length;
    const tokens: Token[] = [];

    for (const themedToken of lineTokens) {
      let content = themedToken.content;

      if (toDrop > 0) {
        const drop = Math.min(toDrop, content.length);
        content = content.slice(drop);
        toDrop -= drop;
        if (!content) continue;
      }

      const style = (themedToken.htmlStyle ?? {}) as Record<string, string>;

      if (isLiteral(themedToken) || !/[()[\]{}]/.test(content)) {
        tokens.push({ content, style });
        continue;
      }

      let buffer = "";
      const flush = () => {
        if (buffer) {
          tokens.push({ content: buffer, style });
          buffer = "";
        }
      };

      for (const ch of content) {
        if (OPEN.includes(ch)) {
          flush();
          tokens.push({ content: ch, style, bracket: depth % 3 });
          depth += 1;
        } else if (CLOSE.includes(ch)) {
          flush();
          depth = Math.max(0, depth - 1);
          tokens.push({ content: ch, style, bracket: depth % 3 });
        } else {
          buffer += ch;
        }
      }
      flush();
    }

    return { ...guides[index], tokens };
  });
}

// ------------------------------------------------------------- 입구

// 문제 본문은 바뀌지 않는다. 같은 코드를 다시 토큰화하지 않는다.
const cache = new Map<string, Highlighted>();

export async function highlight(code: string, language: Language): Promise<Highlighted> {
  const key = `${language} ${code}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const pair = THEMES[language] ?? THEMES.javascript;
  const rawLines = code.split("\n");

  try {
    const highlighter = await getHighlighter();
    const { tokens } = highlighter.codeToTokens(code, {
      lang: language,
      themes: { light: pair.light, dark: pair.dark },
      defaultColor: false,
      // 문자열·주석 안의 괄호를 걸러내려면 스코프가 필요하다.
      includeExplanation: "scopeName",
    });

    const indentUnit = detectIndentUnit(rawLines);
    const result: Highlighted = {
      lines: decorate(tokens, rawLines, indentUnit),
      indentUnit,
      colors: readColors(highlighter, pair, language),
    };
    cache.set(key, result);
    return result;
  } catch {
    // 강조에 실패해도 문제는 읽을 수 있어야 한다. 색 없이 원문 그대로.
    return {
      lines: rawLines.map((line) => ({
        guides: 0,
        indentRest: "",
        tokens: [{ content: line, style: {} }],
      })),
      indentUnit: 4,
      colors: FALLBACK,
    };
  }
}
