import { api } from "./api";
import type { ReviewStatus, SubmissionResult } from "./types";

/**
 * 제출·검수 기록을 다루는 창구. Spring Boot 서버를 부른다.
 *
 * 인터페이스를 남겨 둔 것은 구현을 갈아끼울 자리로서다. 화면 코드는 fetch 를
 * 직접 하지 않고 이 창구만 보므로, 나중에 저장소가 바뀌어도 여기만 바뀐다.
 *
 * 신고·숨김·집계·다른 사람 답은 걷어냈다. 넷 다 "남의 답 보여주기" 하나에
 * 딸려 있던 것이다.
 */

export interface Store {
  /**
   * 답을 내고 채점 결과를 받는다.
   *
   * 채점 결과를 인자로 받지 않는다. 서버가 채점하기 때문이다 — 브라우저가
   * 보낸 값을 그대로 저장하면 기록을 아무나 흔들 수 있다.
   */
  submit(questionId: string, name: string): Promise<SubmissionResult>;
  getReviews(): Promise<Record<string, ReviewStatus>>;
  setReview(questionId: string, status: ReviewStatus): Promise<void>;
}

/** 엔드포인트는 server/src/main/java/dev/namekata/api 참고. */
class HttpStore implements Store {
  submit(questionId: string, name: string): Promise<SubmissionResult> {
    return api<SubmissionResult>("/submissions", {
      method: "POST",
      body: { questionId, name },
    });
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
}

let cached: Store | null = null;

export function getStore(): Store {
  cached ??= new HttpStore();
  return cached;
}
