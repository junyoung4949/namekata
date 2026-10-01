import { promises as fs } from "node:fs";
import path from "node:path";
import type { Question } from "./types";

/**
 * 추출기가 만든 data/questions.json 을 읽는다.
 *
 * 서버(Spring)를 쓰지 않을 때만 쓰인다. NAMEKATA_API_URL 이 있으면 문제는
 * 서버에서 오고 이 파일은 아무도 안 읽는다 (lib/questions.ts 참고).
 *
 * lib/questions.ts 가 아니라 여기 따로 둔 이유는 순환 참조 때문이다.
 * questions.ts 는 검수 상태를 얹으려고 store.ts 를 쓰는데, store.ts 의
 * FileStore 는 채점하려고 문제의 정답이 필요하다. 읽기만 하는 부분을
 * 떼어 두면 questions.ts → store.ts → 여기 로 한 방향이 된다.
 */

const DATA_FILE = path.join(process.cwd(), "..", "data", "questions.json");

let cache: Question[] | null = null;

export async function readQuestionsFile(): Promise<Question[]> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Question[];
  } catch {
    cache = [];
  }
  return cache;
}

export async function findInFile(id: string): Promise<Question | null> {
  return (await readQuestionsFile()).find((question) => question.id === id) ?? null;
}
