import { segment } from "./scoring";
import {
  MODAL,
  NOUNS,
  PREFIX,
  PREPOSITION,
  QUANTITY,
  TECHNICAL,
  VERBS,
  VERBS_HEAD,
} from "./words";

/**
 * 이름을 역할로 가른다.
 *
 * 설명을 읽게 만들지 않고 색만으로 구조가 보이게 하려는 것이다. 무엇을
 * 하는 말이고 무엇에 대한 말인지가 눈에 들어오면, 여러 문제를 풀면서
 * 규칙은 반복으로, 예외는 대비로 남는다.
 *
 * 순서가 중요하다. 닫힌 목록으로 확실한 것부터 떼어내고, 남은 것에
 * 위치 규칙을 적용하고, 그래도 남은 것을 수식어로 본다. 순서를 바꾸면
 * 같은 단어가 이름마다 다르게 칠해진다.
 *
 * 채점이 아니라 참고 표시다. 애매하면 칠하지 않는 쪽으로 기운다 —
 * 틀린 색을 보여주는 것보다 아무 말도 안 하는 편이 낫다.
 */

export type Role =
  | "verb" // 하는 일
  | "core" // 핵심 명사
  | "modifier" // 수식어
  | "prefix" // 판정 접두사 (is, has)
  | "preposition" // 전치사
  | "quantity" // 수량·범위
  | "technical"; // 기술 역할어 (Repository, Dto)

export type Part = {
  text: string;
  role: Role;
  /** 이 조각 앞에 있던 원문 (snake_case 의 _ 같은 것) */
  before: string;
};

export function analyze(name: string): Part[] {
  const pieces = split(name);
  const lower = pieces.map((piece) => piece.text.toLowerCase());
  const roles: (Role | null)[] = pieces.map(() => null);

  // 1) 닫힌 목록. 자리에 따라 뜻이 달라지는 둘은 여기서 함께 거른다.
  lower.forEach((word, index) => {
    const last = index === lower.length - 1;
    if (index === 0 && PREFIX.has(word)) roles[index] = "prefix";
    else if (index > 0 && PREPOSITION.has(word)) roles[index] = "preposition";
    else if (QUANTITY.has(word) && !last) roles[index] = "quantity";
    else if (TECHNICAL.has(word)) roles[index] = "technical";
  });

  // 2) 동사는 최대 하나. 앞에서부터 처음 찾은 것만 칠한다.
  //
  // 뒤에 또 동사처럼 생긴 말이 있어도 넘어간다 (get_send_file_max_age 의
  // send 는 send_file 이라는 이름의 일부지 동작이 아니다). 두 군데를
  // 칠하면 순서가 뒤집힌 이름과 구별되지 않는다.
  // 조동사 뒤에는 동작이 온다 (shouldDisplayMessage). is·has 뒤는 상태나
  // 대상이므로 그 자리를 동사로 보지 않는다 (hasText 의 Text 는 핵심 명사다).
  const head = roles[0] === "prefix" && MODAL.has(lower[0]) ? 1 : 0;
  const verb = lower.findIndex(
    (word, index) =>
      roles[index] === null && (VERBS.has(word) || (index === head && VERBS_HEAD.has(word))),
  );
  if (verb !== -1) roles[verb] = "verb";

  // 3) 핵심 명사는 뒤에서 찾는다. 목록에 걸린 말은 건너뛰고, 동사를
  //    만나면 핵심 명사가 없는 이름이다 (userGet, nullSafeEquals).
  for (let index = lower.length - 1; index >= 0; index--) {
    if (roles[index] === "verb" || roles[index] === "prefix") break;
    if (roles[index] === null) {
      roles[index] = "core";
      break;
    }
  }

  // 4) 남은 것은 수식어.
  return pieces.map((piece, index) => ({
    text: piece.text,
    before: piece.before,
    role: roles[index] ?? "modifier",
  }));
}

type Piece = { text: string; before: string };

/** 원문을 조각으로 나눈다. 조각 사이의 구분자는 그대로 들고 간다. */
function split(name: string): Piece[] {
  const found = segment(name);
  const pieces: Piece[] = [];
  let cursor = 0;

  for (const { text, index } of found) {
    pieces.push({ text, before: name.slice(cursor, index) });
    cursor = index + text.length;
  }

  // 경계가 없는 이름(getuserbyid)은 사전으로 한 번 더 쪼갠다.
  if (pieces.length === 1) {
    const glued = splitGlued(pieces[0].text);
    if (glued) {
      return glued.map((text, index) => ({
        text,
        before: index === 0 ? pieces[0].before : "",
      }));
    }
  }
  return pieces;
}

const DICTIONARY = new Set([
  ...PREFIX,
  ...PREPOSITION,
  ...QUANTITY,
  ...TECHNICAL,
  ...VERBS,
  ...VERBS_HEAD,
  ...NOUNS,
]);

/**
 * 붙여 쓴 이름을 사전으로 쪼갠다.
 *
 * 가장 적은 개수로 쪼개지는 방법이 **하나뿐일 때만** 쓴다. 후보가 갈리면
 * 포기하고 통째로 둔다 — 사전 분할은 therapist 를 the + rapist 로 가르는
 * 사고를 내는데, 그렇게 칠린 색은 아무 색도 없느니만 못하다.
 */
function splitGlued(word: string): string[] | null {
  const lower = word.toLowerCase();
  if (lower.length < 7 || DICTIONARY.has(lower)) return null;

  // best[i] = lower.slice(0, i) 를 쪼개는 데 든 최소 조각 수
  const best = new Array<number>(lower.length + 1).fill(Infinity);
  const ways = new Array<number>(lower.length + 1).fill(0);
  const from = new Array<number>(lower.length + 1).fill(-1);
  best[0] = 0;
  ways[0] = 1;

  for (let end = 2; end <= lower.length; end++) {
    for (let start = 0; start <= end - 2; start++) {
      if (best[start] === Infinity) continue;
      if (!DICTIONARY.has(lower.slice(start, end))) continue;
      const count = best[start] + 1;
      if (count < best[end]) {
        best[end] = count;
        ways[end] = ways[start];
        from[end] = start;
      } else if (count === best[end]) {
        ways[end] += ways[start];
      }
    }
  }

  const total = lower.length;
  if (best[total] === Infinity || best[total] < 2 || ways[total] !== 1) return null;

  const parts: string[] = [];
  for (let end = total; end > 0; end = from[end]) {
    parts.unshift(word.slice(from[end], end));
  }
  return parts;
}
