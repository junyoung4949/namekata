import type { QuestionSource } from "./types";

/**
 * 출처 표기가 온전한지 확인한다.
 *
 * 왜 이런 검사가 따로 필요한가. 저작권자는 못 찾은 문제가 있어서 null 이
 * 올 수 있고, 그래서 쓰는 쪽이 이렇게 생겼다:
 *
 *     {source.copyrightHolder ? ` · ${source.copyrightHolder}` : ""}
 *
 * 서버가 칸 이름을 바꾸면 이 값은 undefined 가 되고, 삼항 연산자는 거짓
 * 가지를 타서 **표기가 그냥 안 그려진다.** 오류도 빈 화면도 없이, 완전히
 * 정상으로 보이는 페이지가 나온다. TypeScript 의 타입은 실행 중에 사라지므로
 * 컴파일러도 잡아 주지 못한다 — 이 경계에서만 안전망이 끊긴다.
 *
 * 그래서 "값이 null"과 "칸이 없음"을 구분한다. 앞은 정상이고 뒤는 버그다.
 *
 * 걸리면 화면을 못 그리게 막는다. 표기를 못 붙이겠으면 코드를 보여 주지
 * 않는 것이 맞다 — Apache-2.0 이 요구하는 것은 고지의 유지이고, 고지 없이
 * 코드를 내보내는 쪽이 고장난 페이지보다 나쁘다.
 */
export function requireAttribution(source: QuestionSource): QuestionSource {
  // 값이 비어 있으면 안 되는 칸.
  for (const field of ["repo", "repoUrl", "filePath", "commitHash", "license", "url"] as const) {
    if (!source[field]) {
      throw new Error(
        `출처에 ${field} 가 없다 — 서버 응답 모양이 바뀌었을 수 있다 (api.SourceView 확인)`,
      );
    }
  }

  // 값은 null 이어도 되지만, 칸 자체는 있어야 하는 것.
  if (!("copyrightHolder" in source)) {
    throw new Error(
      "출처에 copyrightHolder 칸이 없다 — 서버 응답 모양이 바뀌었다 (api.SourceView 확인). " +
        "저작권자를 못 찾은 문제는 null 로 오므로, 칸이 통째로 없는 것은 다른 일이다",
    );
  }

  return source;
}
