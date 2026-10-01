import type { ThemeRegistrationRaw } from "shiki/core";

/**
 * IntelliJ IDEA 배색 (Darcula / IntelliJ Light). **Java 전용이다.**
 *
 * Python·JS는 VS Code 기본 테마(Dark+ / Light+)를 쓴다. 어느 언어에 무엇을
 * 쓸지는 lib/highlight.ts 의 THEMES 에 있다.
 *
 * shiki에 Darcula가 없어서 직접 만든다. 색값은 IntelliJ 기본 배색 그대로다.
 *
 * 주의할 점 — IntelliJ는 심볼을 해석해서 색을 정하지만 TextMate 문법은
 * 정규식이라 그러지 못한다. 그래서 다음 두 가지는 의도적으로 IntelliJ와
 * 다르게 둔다:
 *
 * - 필드(보라), static 멤버(이탤릭): 문법만으로는 구분할 수 없고, 문제 코드는
 *   메서드 하나만 잘라낸 거라 클래스 문맥이 없어 애초에 알 수도 없다.
 * - 메서드 선언 이름: 우리 문제에서 선언 이름은 언제나 가려진 빈칸이라
 *   테마가 칠할 일이 없다. 답을 공개할 때 CSS가 선언 색(#FFC66D)을 준다.
 *
 * 연산자를 IntelliJ와 맞추는 것도 한 가지 함정이다. TextMate는 `=`, `<`, `++`
 * 를 keyword.operator 로 묶지만 IntelliJ에서 연산자는 키워드 색이 아니라
 * 기본 글자색이다. 아래에서 따로 되돌려 놓는다.
 */

type Palette = {
  fg: string;
  bg: string;
  keyword: string;
  number: string;
  string: string;
  escape: string;
  annotation: string;
  comment: string;
  javadoc: string;
  methodDeclaration: string;
  gutterBg: string;
  gutterFg: string;
};

const DARCULA: Palette = {
  fg: "#A9B7C6",
  bg: "#2B2B2B",
  keyword: "#CC7832",
  number: "#6897BB",
  string: "#6A8759",
  escape: "#CC7832",
  annotation: "#BBB529",
  comment: "#808080",
  javadoc: "#629755",
  methodDeclaration: "#FFC66D",
  gutterBg: "#313335",
  gutterFg: "#606366",
} as const;

const LIGHT: Palette = {
  fg: "#080808",
  bg: "#FFFFFF",
  keyword: "#0033B3",
  number: "#1750EB",
  string: "#067D17",
  escape: "#0037A6",
  annotation: "#9E880D",
  comment: "#8C8C8C",
  javadoc: "#3D7A3D",
  methodDeclaration: "#00627A",
  gutterBg: "#F2F2F2",
  gutterFg: "#999999",
} as const;

function build(name: string, type: "dark" | "light", c: Palette): ThemeRegistrationRaw {
  return {
    name,
    type,
    colors: {
      "editor.background": c.bg,
      "editor.foreground": c.fg,
      // lib/highlight.ts 가 코드 블록 거터 색으로 읽어간다.
      "editorGutter.background": c.gutterBg,
      "editorLineNumber.foreground": c.gutterFg,
    },
    settings: [
      // 기본값. 식별자·타입·지역 변수·파라미터·구두점이 모두 여기에 해당한다.
      { settings: { foreground: c.fg, background: c.bg } },

      // 키워드. 접근 제어자와 원시 타입(int, boolean)도 IntelliJ에서는 키워드다.
      {
        scope: [
          "keyword",
          "keyword.control",
          "keyword.other",
          "keyword.control.new",
          "storage",
          "storage.type",
          "storage.modifier",
          "variable.language",
          "constant.language",
        ],
        settings: { foreground: c.keyword },
      },

      // 기호 연산자는 키워드 색이 아니다. IntelliJ에서 `=`, `<`, `++`, `&&` 는
      // 기본 글자색이다. 위에서 keyword로 묶인 것을 되돌린다.
      {
        scope: ["keyword.operator", "punctuation", "meta.brace"],
        settings: { foreground: c.fg },
      },

      // 단어로 된 연산자(`instanceof`, `new`)는 다시 키워드다.
      {
        scope: ["keyword.operator.word", "keyword.operator.instanceof", "keyword.operator.new"],
        settings: { foreground: c.keyword },
      },

      // 타입·클래스 참조는 키워드가 아니다. TextMate는 `CharSequence` 도
      // storage.type.java 로 묶지만 IntelliJ에서는 기본 글자색이다.
      // (storage.type.primitive.java 는 이 선택자에 걸리지 않으므로 키워드로 남는다.)
      {
        scope: [
          "storage.type.java",
          "storage.type.generic.java",
          "entity.name.type",
          "entity.other.inherited-class",
          "support.type",
          "support.class",
        ],
        settings: { foreground: c.fg },
      },

      { scope: ["string", "string.quoted", "punctuation.definition.string"], settings: { foreground: c.string } },
      { scope: ["constant.character.escape", "string.regexp"], settings: { foreground: c.escape } },
      { scope: ["constant.numeric"], settings: { foreground: c.number } },

      // 애너테이션. @ 기호와 이름을 같은 색으로.
      {
        scope: [
          "storage.type.annotation",
          "punctuation.definition.annotation",
          "meta.declaration.annotation",
        ],
        settings: { foreground: c.annotation },
      },

      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.comment, fontStyle: "italic" } },
      { scope: ["comment.block.documentation"], settings: { foreground: c.javadoc, fontStyle: "italic" } },

      // 메서드 호출은 IntelliJ에서 기본 글자색이다. 선언만 노란색인데, 우리
      // 문제에서 선언 이름은 항상 가려져 있으므로 여기서는 전부 기본색으로 둔다.
      {
        scope: [
          "entity.name.function",
          "meta.function-call",
          "meta.method-call",
          "variable.function",
        ],
        settings: { foreground: c.fg },
      },
    ],
  };
}

export const darcula = build("intellij-darcula", "dark", DARCULA);
export const intellijLight = build("intellij-light", "light", LIGHT);
