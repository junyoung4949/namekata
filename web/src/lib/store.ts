import { api } from "./api";
import type { SubmissionResult } from "./types";

/**
 * 제출을 보내는 창구. Spring Boot 서버를 부른다.
 *
 * 인터페이스를 남겨 둔 것은 구현을 갈아끼울 자리로서다. 화면 코드는 fetch 를
 * 직접 하지 않고 이 창구만 보므로, 나중에 저장소가 바뀌어도 여기만 바뀐다.
 *
 * 신고·숨김·집계·다른 사람 답은 걷어냈다. 넷 다 "남의 답 보여주기" 하나에
 * 딸려 있던 것이다. 검수(승인·거부)도 없앴다 — 문제를 고르는 일은 가이드
 * 저자가 장에 붙이면서 한다.
 */

export interface Store {
  /**
   * 답을 내고 채점 결과를 받는다.
   *
   * 채점 결과를 인자로 받지 않는다. 서버가 채점하기 때문이다 — 브라우저가
   * 보낸 값을 그대로 저장하면 기록을 아무나 흔들 수 있다.
   */
  submit(questionId: string, name: string): Promise<SubmissionResult>;
}

/** 엔드포인트는 server/src/main/java/dev/namekata/api 참고. */
class HttpStore implements Store {
  submit(questionId: string, name: string): Promise<SubmissionResult> {
    return api<SubmissionResult>("/submissions", {
      method: "POST",
      body: { questionId, name },
    });
  }

}

let cached: Store | null = null;

export function getStore(): Store {
  cached ??= new HttpStore();
  return cached;
}
