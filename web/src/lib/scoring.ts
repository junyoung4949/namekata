/**
 * 이름을 단어로 쪼갠다. 원문 그대로, 어디서 잘랐는지와 함께.
 *
 * camelCase·snake_case·약어(URL, OWS)를 가른다. 추출기(tools/extract의
 * split_words)와 같은 규칙이어야 한다. 위치를 함께 돌려주는 건 역할별로
 * 색을 칠할 때 원문의 구분자(_)를 되살려야 하기 때문이다 (lib/role.ts).
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
 * 단어 단위 일치 표시.
 *
 * 쪼갠 단어를 소문자로 맞춰 원본과 겹치는 것을 찾는다.
 */
export function splitWords(name: string): string[] {
  return segment(name).map((part) => part.text.toLowerCase());
}

/** 제출한 이름이 식별자로 쓸 수 있는 모양인지. */
export function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && name.length <= 60;
}

/** 같은 답을 묶기 위한 열쇠. 표기만 다른 답(get_id / getId)은 따로 센다. */
export function normalizeForGrouping(name: string): string {
  return name.trim();
}

export function matchWords(submitted: string, answer: string) {
  const submittedWords = splitWords(submitted);
  const answerWords = splitWords(answer);
  const pool = [...answerWords];
  const matchedWords: string[] = [];

  for (const word of submittedWords) {
    const index = pool.indexOf(word);
    if (index !== -1) {
      matchedWords.push(word);
      pool.splice(index, 1);
    }
  }

  return {
    submittedWords,
    answerWords,
    matchedWords,
    exact: submitted.trim() === answer,
  };
}
