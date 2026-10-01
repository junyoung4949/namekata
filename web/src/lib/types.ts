export type Language = "java" | "python" | "javascript";
export type ReviewStatus = "pending" | "approved" | "rejected";

/** lv0~lv5. 추출기가 정적으로 매기고, 표본이 쌓이면 실측으로 덮는다 (lib/level.ts). */
export type Level = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 한 문제에 쌓인 제출 집계.
 *
 * 두 가지를 따로 센다. 단어 겹침은 이 앱이 쓰는 채점 기준이고(matchWords),
 * 원본 일치는 글자까지 똑같았던 비율이다. 이름 짓기에 정답은 없다는 게
 * 이 앱의 입장이라 목록에는 겹침률을 쓰고, 일치율은 문제를 푼 뒤에 보인다.
 */
export type QuestionStats = {
  total: number;
  /** 단어가 하나라도 겹친 제출 수. */
  partial: number;
  /** 원본과 글자까지 같았던 제출 수. */
  exact: number;
};

export type QuestionSource = {
  repo: string;
  repo_url: string;
  commit_hash: string;
  file_path: string;
  start_line: number;
  end_line: number;
  url: string;
  license: string;
  copyright_holder: string | null;
};

/** 추출기(tools/extract)가 만든 문제 한 건. */
export type Question = {
  id: string;
  language: Language;
  kind: "method" | "variable" | "class";
  answer: string;
  answer_words: string[];
  masked_code: string;
  placeholder: string;
  /**
   * 이 함수를 품고 있는 클래스 이름. 없으면 파일 바로 아래 함수다.
   *
   * 어느 클래스의 메서드인지는 이름을 짓기 전에 알아야 하는 것이라
   * 코드 조각 바깥에서 따로 들고 온다 (tools/extract 의 enclosing_owner).
   */
  owner: string | null;
  /** 추출기가 떼어낸 원본 주석. 주석 보기를 눌렀을 때만 내려보낸다. */
  docstring: string | null;
  level: Level;
  status: ReviewStatus;
  /**
   * 자동 검사가 확신하지 못한 자리. 빈 목록이면 깨끗이 통과했다.
   *
   * 답이 한 단어로 그대로 남았으면 추출기가 버리지만, 더 긴 이름의
   * 일부로만 남은 경우는 답이 보이는지 코드를 봐야 안다. 버리는 대신
   * 표시를 달아 검수 화면이 먼저 보여준다 (tools/extract 의 Masked).
   */
  review_flags?: string[];
  source: QuestionSource;
};

/**
 * 풀이 화면에 내려보내는 형태. 정답과 docstring이 빠져 있다.
 *
 * 이름의 길이만은 일부러 내려보낸다. 빈칸을 글자 수만큼 그려서
 * 몇 글자짜리 이름인지 보이게 하기로 했다.
 */
export type PublicQuestion = Omit<Question, "answer" | "answer_words" | "docstring" | "status"> & {
  hasComment: boolean;
  answerLength: number;
};

export type OtherAnswer = {
  name: string;
  count: number;
};

export type SubmissionResult = {
  answer: string;
  answerWords: string[];
  submittedWords: string[];
  matchedWords: string[];
  exact: boolean;
  docstring: string | null;
  others: OtherAnswer[];
};
