/**
 * 서버(Spring Boot)가 내려보내는 모양.
 *
 * 칸 이름이 camelCase 인 것은 서버가 그렇게 보내기 때문이다. 전에는 여기에
 * snake_case 벌이 하나 더 있었다 — 추출기가 만든 data/questions.json 을 웹이
 * 직접 읽던 시절의 모양이고, 둘 사이를 번역하는 함수가 세 개 있었다. 문제가
 * DB 로 들어가면서 파일을 읽을 일이 없어져 벌을 하나로 합쳤다.
 *
 * 각 타입이 서버의 어느 레코드를 보고 있는지 주석으로 적어 둔다. 손으로 맞춘
 * 것이라 Java 쪽에서 칸 이름을 바꾸면 여기도 고쳐야 한다 — 컴파일러가 못
 * 잡아 주는 자리다.
 */

export type Language = "java" | "python" | "javascript";
export type Kind = "method" | "variable" | "class";

/**
 * 출처. 서버의 {@code api.SourceView}.
 *
 * repoUrl 과 url 은 저장된 값이 아니라 서버가 조합해 준다.
 */
export type QuestionSource = {
  repo: string;
  repoUrl: string;
  commitHash: string;
  filePath: string;
  startLine: number;
  endLine: number;
  url: string;
  license: string;
  /**
   * 저작권자. 찾지 못한 문제가 있어서 null 이 올 수 있다.
   *
   * 칸 자체가 없는 것(서버 응답 모양이 바뀜)과 값이 null 인 것은 다른
   * 일이다. 표기는 라이선스 의무라서 조용히 빠지면 안 되므로, 쓰는 쪽에서
   * 둘을 구분한다 (components/Attribution.tsx).
   */
  copyrightHolder: string | null;
};

/**
 * 연습 화면에 내려오는 문제. 서버의 {@code api.PublicController.PublicQuestion}.
 *
 * 정답이 빠져 있다. 이름의 길이만은 일부러 내려온다 — 빈칸을 글자 수만큼
 * 그려서 몇 글자짜리 이름인지 보이게 하기로 했다.
 */
export type PublicQuestion = {
  id: string;
  language: Language;
  kind: Kind;
  maskedCode: string;
  placeholder: string;
  /**
   * 이 함수를 품고 있는 클래스 이름. 없으면 파일 바로 아래 함수다.
   *
   * 어느 클래스의 메서드인지는 이름을 짓기 전에 알아야 하는 것이라
   * 코드 조각 바깥에서 따로 들고 온다 (tools/extract 의 enclosing_owner).
   */
  owner: string | null;
  /** 추출기가 코드만 보고 매긴 등급. 검수 화면이 참고값으로 쓴다. */
  level: number;
  /**
   * 자동 검사가 확신하지 못한 자리. 빈 목록이면 깨끗이 통과했다.
   *
   * 답이 한 단어로 그대로 남았으면 추출기가 버리지만, 더 긴 이름의
   * 일부로만 남은 경우는 답이 보이는지 코드를 봐야 안다. 버리는 대신
   * 표시를 달아 검수 화면이 먼저 보여준다 (tools/extract 의 Masked).
   */
  reviewFlags: string[];
  answerLength: number;
  source: QuestionSource;
};

/** 해설이 가리키는 장. 서버의 {@code guide.PracticeNotes.ChapterRef}. */
export type ChapterRef = {
  guideSlug: string;
  chapterSlug: string;
  title: string;
};

/**
 * 제출 직후 내려오는 것. 서버의 {@code api.PublicController.PracticeResult}.
 *
 * 해설(rationale)은 제출한 뒤에만 내려온다 — 답 단어를 그대로 설명하는 글이라
 * 문제와 함께 보내면 답이 샌다. 반대로 상황 설명(brief)은 풀기 전부터 보인다.
 */
export type SubmissionResult = {
  answer: string;
  answerWords: string[];
  submittedWords: string[];
  matchedWords: string[];
  exact: boolean;
  rationale: string | null;
  references: ChapterRef[];
};
