import { promises as fs } from "node:fs";
import path from "node:path";
import { api, isUsingServer } from "./api";
import { findInFile } from "./questions-file";
import { matchWords } from "./scoring";
import type { OtherAnswer, QuestionStats, ReviewStatus, SubmissionResult } from "./types";

/**
 * 제출·신고·검수 기록을 다루는 창구.
 *
 * 구현체가 둘이다.
 *
 * - {@link HttpStore} — Spring Boot 서버를 부른다. NAMEKATA_API_URL 이 있으면 이쪽
 * - {@link FileStore} — 파일 하나에 쓴다. 서버를 안 띄우고 화면만 만질 때 쓴다
 *
 * 화면 코드는 둘을 구별하지 않는다. 바뀌는 건 getStore() 가 무엇을 돌려주느냐뿐이다.
 */

export type Report = {
  questionId: string;
  name: string;
  at: string;
};

export interface Store {
  /**
   * 답을 내고 채점 결과를 받는다.
   *
   * 채점 결과를 인자로 받지 않는다. 서버가 채점하기로 했기 때문이다 —
   * 집계가 난이도가 되고 난이도가 목록 정렬에 쓰이니, 보내온 값을 믿으면
   * 아무나 등급을 흔들 수 있다. 파일 저장소도 같은 규칙으로 제가 채점한다.
   */
  submit(questionId: string, name: string): Promise<SubmissionResult>;
  getAnswers(questionId: string): Promise<OtherAnswer[]>;
  /** 문제별 제출 집계. 목록 화면이 한 번에 전부 쓴다. */
  getStats(): Promise<Record<string, QuestionStats>>;
  report(questionId: string, name: string): Promise<void>;
  listReports(): Promise<Report[]>;
  getReviews(): Promise<Record<string, ReviewStatus>>;
  setReview(questionId: string, status: ReviewStatus): Promise<void>;
  hideAnswer(questionId: string, name: string): Promise<void>;
}

// ------------------------------------------------------------- 서버 저장소

/** Spring Boot 서버를 부른다. 엔드포인트는 server/src/main/java/dev/namekata/api 참고. */
class HttpStore implements Store {
  submit(questionId: string, name: string): Promise<SubmissionResult> {
    return api<SubmissionResult>("/submissions", {
      method: "POST",
      body: { questionId, name },
    });
  }

  getAnswers(questionId: string): Promise<OtherAnswer[]> {
    return api<OtherAnswer[]>(`/questions/${encodeURIComponent(questionId)}/answers`);
  }

  getStats(): Promise<Record<string, QuestionStats>> {
    return api<Record<string, QuestionStats>>("/questions/stats");
  }

  async report(questionId: string, name: string) {
    await api("/reports", { method: "POST", body: { questionId, name } });
  }

  async listReports(): Promise<Report[]> {
    const rows = await api<{ questionId: string; name: string; at: string }[]>("/admin/reports", {
      admin: true,
    });
    return rows.map((row) => ({ questionId: row.questionId, name: row.name, at: row.at }));
  }

  async getReviews(): Promise<Record<string, ReviewStatus>> {
    // 서버는 검수 상태를 문제에 실어 보낸다. 전에는 상태만 따로 있는
    // 테이블이었는데, 문제가 DB로 들어오면서 questions.status 한 칸이 됐다.
    const rows = await api<{ id: string; status: ReviewStatus }[]>("/admin/questions", {
      admin: true,
    });
    const reviews: Record<string, ReviewStatus> = {};
    for (const row of rows) reviews[row.id] = row.status;
    return reviews;
  }

  async setReview(questionId: string, status: ReviewStatus) {
    await api(`/admin/questions/${encodeURIComponent(questionId)}/review`, {
      method: "POST",
      body: { status },
      admin: true,
    });
  }

  async hideAnswer(questionId: string, name: string) {
    await api(`/admin/questions/${encodeURIComponent(questionId)}/hide`, {
      method: "POST",
      body: { name },
      admin: true,
    });
  }
}

// ------------------------------------------------------------- 파일 저장소

type Grade = { exact: boolean; partial: boolean };

type FileShape = {
  submissions: { questionId: string; name: string; at: string; grade?: Grade }[];
  hidden: { questionId: string; name: string }[];
  reviews: Record<string, ReviewStatus>;
  reports: Report[];
};

const EMPTY: FileShape = { submissions: [], hidden: [], reviews: {}, reports: [] };

/**
 * 파일 한 개에 쓴다. 개발용이다.
 *
 * 여러 프로세스가 동시에 쓰면 덮어쓰기가 난다. 서버를 안 띄우고 화면만
 * 고칠 때 쓰라고 남겨 둔 것이지, 운영에 쓰라고 있는 게 아니다.
 */
class FileStore implements Store {
  private file = path.join(process.cwd(), "..", "data", "local-store.json");
  /** 읽기-수정-쓰기가 겹치지 않도록 직렬화한다. */
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<FileShape> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      return { ...EMPTY, ...(JSON.parse(raw) as Partial<FileShape>) };
    } catch {
      return structuredClone(EMPTY);
    }
  }

  private write<T>(mutate: (data: FileShape) => T): Promise<T> {
    const next = this.queue.then(async () => {
      const data = await this.read();
      const result = mutate(data);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(data, null, 2));
      return result;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  async submit(questionId: string, name: string): Promise<SubmissionResult> {
    const question = await findInFile(questionId);
    if (!question) throw new Error(`없는 문제: ${questionId}`);

    const { submittedWords, answerWords, matchedWords, exact } = matchWords(name, question.answer);
    const grade = { exact, partial: matchedWords.length > 0 };

    await this.write((data) => {
      data.submissions.push({ questionId, name, at: new Date().toISOString(), grade });
    });

    return {
      answer: question.answer,
      answerWords,
      submittedWords,
      matchedWords,
      exact,
      docstring: question.docstring,
      others: await this.getAnswers(questionId),
    };
  }

  async getStats(): Promise<Record<string, QuestionStats>> {
    const data = await this.read();
    const stats: Record<string, QuestionStats> = {};
    for (const row of data.submissions) {
      // 채점 결과가 붙기 전에 쌓인 제출은 총계에만 넣는다. 비율을 0으로
      // 세면 옛 문제들이 실제보다 어려워 보인다.
      if (!row.grade) continue;
      const entry = (stats[row.questionId] ??= { total: 0, partial: 0, exact: 0 });
      entry.total += 1;
      if (row.grade.partial) entry.partial += 1;
      if (row.grade.exact) entry.exact += 1;
    }
    return stats;
  }

  async getAnswers(questionId: string): Promise<OtherAnswer[]> {
    const data = await this.read();
    const hidden = new Set(
      data.hidden.filter((h) => h.questionId === questionId).map((h) => h.name),
    );
    const counts = new Map<string, number>();
    for (const row of data.submissions) {
      if (row.questionId !== questionId || hidden.has(row.name)) continue;
      counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async report(questionId: string, name: string) {
    await this.write((data) => {
      data.reports.push({ questionId, name, at: new Date().toISOString() });
    });
  }

  async listReports() {
    return (await this.read()).reports;
  }

  async getReviews() {
    return (await this.read()).reviews;
  }

  async setReview(questionId: string, status: ReviewStatus) {
    await this.write((data) => {
      data.reviews[questionId] = status;
    });
  }

  async hideAnswer(questionId: string, name: string) {
    await this.write((data) => {
      if (!data.hidden.some((h) => h.questionId === questionId && h.name === name)) {
        data.hidden.push({ questionId, name });
      }
    });
  }
}

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  cached = isUsingServer() ? new HttpStore() : new FileStore();
  return cached;
}

/** 지금 어느 저장소를 쓰는지. 검수 화면이 안내 문구를 고를 때 쓴다. */
export function storeKind(): "server" | "file" {
  return isUsingServer() ? "server" : "file";
}
