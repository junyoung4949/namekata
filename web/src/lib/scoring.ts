/**
 * 이름을 글자 그대로 다루는 것들. 채점은 여기서 하지 않는다.
 *
 * 전에는 이 파일에 채점(splitWords + matchWords)이 있었다. 파일 저장소가
 * 제 손으로 채점해야 했기 때문인데, 그걸 지우면서 함께 없앴다. 채점은 서버
 * 한 곳에서만 한다 (server 의 naming.Identifier).
 *
 * 여기 남은 둘은 채점이 아니라 **화면**이다. segment 는 색을 칠할 자리를
 * 찾고, isValidIdentifier 는 보내기 전에 거른다. 그래서 서버와 같은 규칙일
 * 필요가 없고, 어긋나도 채점 결과가 달라지지 않는다.
 */

/**
 * 이름을 단어로 쪼갠다. 원문 그대로, 어디서 잘랐는지와 함께.
 *
 * camelCase·snake_case·약어(URL, OWS)를 가른다. 위치를 함께 돌려주는 건
 * 역할별로 색을 칠할 때 원문의 구분자(_)를 되살려야 하기 때문이다 (lib/role.ts).
 */
export function segment(name: string): { text: string; index: number }[] {
  const out: { text: string; index: number }[] = [];
  const pattern = /[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(name)) !== null) {
    out.push({ text: match[0], index: match.index });
  }
  return out;
}

/**
 * 제출한 이름이 식별자로 쓸 수 있는 모양인지.
 *
 * 서버도 같은 검사를 한다 (Identifier.of). 이쪽은 서버까지 가기 전에 거르는
 * 것이라 두 벌인 게 맞다 — 여기를 건너뛰고 API 를 직접 부를 수 있으므로
 * 서버 쪽이 없어서는 안 되고, 입력하는 중에 바로 알려주려면 이쪽도 필요하다.
 */
export function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && name.length <= 60;
}
