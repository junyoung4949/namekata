import { api } from "./api";
import type { OtherAnswer, QuestionStats, ReviewStatus, SubmissionResult } from "./types";

/**
 * 제출·신고·검수 기록을 다루는 창구. Spring Boot 서버를 부른다.
 *
 * 전에는 구현체가 둘이었다 — 이 HttpStore 와, 파일 한 개에 쓰는 FileStore.
 * 서버를 안 띄우고 화면만 만지는 길이었는데 지웠다. 이유는 셋이다.
 *
 * - 채점 규칙(단어 쪼개기와 겹침 세기)이 TypeScript 에 한 벌 더 있어야 했다.
 *   같은 규칙이 Python·Java·TS 세 곳에 있었고, 그중 TS 것은 파일 모드 전용이라
 *   어긋나도 아무도 몰랐다
 * - 등급 규칙(표본 기준과 경계 다섯 개)도 같은 이유로 한 벌 더 있었다
 * - 어차피 Postgres 와 서버를 띄워 두고 개발하게 되어 쓰이지 않았다
 *
 * 인터페이스를 남겨 둔 것은 구현을 갈아끼울 자리로서다. 화면 코드는 fetch 를
 * 직접 하지 않고 이 창구만 보므로, 나중에 저장소가 바뀌어도 여기만 바뀐다.
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
   * 채점 결과를 인자로 받지 않는다. 서버가 채점하기 때문이다 — 집계가
   * 난이도가 되고 난이도가 목록 정렬에 쓰이니, 보내온 값을 믿으면 아무나
   * 등급을 흔들 수 있다.
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

/** 엔드포인트는 server/src/main/java/dev/namekata/api 참고. */
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

let cached: Store | null = null;

export function getStore(): Store {
  cached ??= new HttpStore();
  return cached;
}
