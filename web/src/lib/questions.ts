import { api, isUsingServer } from "./api";
import { readQuestionsFile, findInFile } from "./questions-file";
import { getStore } from "./store";
import { resolveLevel, type ResolvedLevel } from "./level";
import type {
  Language,
  Level,
  OtherAnswer,
  PublicQuestion,
  Question,
  QuestionStats,
  ReviewStatus,
  SubmissionResult,
} from "./types";

/**
 * 문제를 어디서 읽을지 고른다.
 *
 * - NAMEKATA_API_URL 이 있으면 Spring Boot 서버에서 (운영 경로)
 * - 없으면 추출기가 만든 data/questions.json 에서 (서버 없이 화면만 만질 때)
 *
 * 서버 경로에서는 등급·집계·검수 상태가 이미 얹혀서 온다. 파일 경로에서는
 * 여기서 저장소의 기록을 겹쳐 놓는다.
 */

/** 서버가 내려보내는 문제. PublicQuestion 과 모양이 같고 이름만 camelCase 다. */
type ServerQuestion = {
  id: string;
  language: Language;
  kind: Question["kind"];
  maskedCode: string;
  placeholder: string;
  owner: string | null;
  level: number;
  measuredLevel: boolean;
  reviewFlags: string[];
  hasComment: boolean;
  answerLength: number;
  source: {
    repo: string;
    repoUrl: string;
    commitHash: string;
    filePath: string;
    startLine: number;
    endLine: number;
    url: string;
    license: string;
    copyrightHolder: string | null;
  };
};

/** 검수 화면용. 정답까지 들어 있다 — 그게 검수할 대상이다. */
type ServerReviewRow = ServerQuestion & {
  answer: string;
  answerWords: string[];
  docstring: string | null;
  status: ReviewStatus;
  retired: boolean;
};

/**
 * 문제에 등급과 집계를 얹은 것. 목록·풀이 화면이 쓴다.
 *
 * 정답과 주석은 들어 있지 않다. 목록에 쓸 일이 없고, 들고 다니면 언젠가
 * 실수로 내려간다.
 */
export type RatedQuestion = PublicQuestion & {
  stats: QuestionStats;
  rated: ResolvedLevel;
};

/**
 * 검수 전 문제까지 풀 수 있게 할지.
 *
 * 추출 직후에는 모든 문제가 pending 이라 승인 전에는 화면이 비어 있다.
 * 서버를 쓸 때는 서버가 같은 판단을 하므로 여기서는 파일 경로에만 쓰인다.
 */
export function allowsPending(): boolean {
  const flag = process.env.NAMEKATA_ALLOW_PENDING;
  if (flag) return flag !== "0" && flag !== "false";
  return process.env.NODE_ENV !== "production";
}

// ---------------------------------------------------------------- 읽기

/** 사용자에게 보여줄 문제. 검수를 통과한 것만 (설정에 따라 미검수 포함). */
export async function listPlayable(language?: Language | "all"): Promise<RatedQuestion[]> {
  const wanted = !language || language === "all" ? undefined : language;

  if (isUsingServer()) {
    const [rows, stats] = await Promise.all([
      api<ServerQuestion[]>(`/questions${wanted ? `?language=${wanted}` : ""}`),
      getStore().getStats(),
    ]);
    return rows.map((row) => fromServer(row, stats[row.id]));
  }

  const [questions, reviews, stats] = await Promise.all([
    readQuestionsFile(),
    getStore().getReviews(),
    getStore().getStats(),
  ]);
  const pendingOk = allowsPending();
  return questions
    .filter((question) => {
      const status = reviews[question.id] ?? question.status;
      return (
        (status === "approved" || (pendingOk && status === "pending")) &&
        (!wanted || question.language === wanted)
      );
    })
    .map((question) => rateFromFile(question, stats[question.id]));
}

export async function getQuestion(id: string): Promise<RatedQuestion | null> {
  if (isUsingServer()) {
    const [row, stats] = await Promise.all([
      api<ServerQuestion | null>(`/questions/${encodeURIComponent(id)}`).catch(() => null),
      getStore().getStats(),
    ]);
    return row ? fromServer(row, stats[row.id]) : null;
  }

  const question = await findInFile(id);
  if (!question) return null;
  const [reviews, stats] = await Promise.all([getStore().getReviews(), getStore().getStats()]);
  const status = reviews[id] ?? question.status;
  if (status === "rejected" || (status === "pending" && !allowsPending())) return null;
  return rateFromFile(question, stats[id]);
}

/** 검수 화면용. 상태와 상관없이 전부. 정답이 들어 있다. */
export async function listAll(): Promise<Question[]> {
  if (isUsingServer()) {
    const rows = await api<ServerReviewRow[]>("/admin/questions", { admin: true });
    return rows.map(toQuestion);
  }

  const [questions, reviews] = await Promise.all([readQuestionsFile(), getStore().getReviews()]);
  return questions.map((question) => ({
    ...question,
    status: reviews[question.id] ?? question.status,
  }));
}

/**
 * 주석만 열어 본다. 제출이 아니므로 저장하지 않는다.
 *
 * 감점은 화면이 매긴다 — "주석을 보고 맞혔다"는 사실은 사용자에게 보이는
 * 것이지 집계에 들어가지 않는다.
 */
export async function openComment(id: string): Promise<string | null> {
  if (isUsingServer()) {
    const found = await api<{ docstring: string | null }>(
      `/questions/${encodeURIComponent(id)}/comment`,
    );
    return found.docstring;
  }
  return (await findInFile(id))?.docstring ?? null;
}

/**
 * 답을 보고 넘어간다.
 *
 * 다른 사람들의 답을 함께 내려보낸다 — 답을 본 뒤에는 감출 이유가 없다.
 */
export async function revealAnswer(
  id: string,
): Promise<{ answer: string; answerWords: string[]; others: OtherAnswer[] } | null> {
  if (isUsingServer()) {
    const result = await api<SubmissionResult>(`/questions/${encodeURIComponent(id)}/answer`);
    return { answer: result.answer, answerWords: result.answerWords, others: result.others };
  }
  const question = await findInFile(id);
  if (!question) return null;
  return {
    answer: question.answer,
    answerWords: question.answer_words,
    others: await getStore().getAnswers(id),
  };
}

export function countsByLanguage(questions: { language: Language }[]): Record<string, number> {
  const counts: Record<string, number> = { all: questions.length };
  for (const question of questions) {
    counts[question.language] = (counts[question.language] ?? 0) + 1;
  }
  return counts;
}

export type ReviewCounts = Record<ReviewStatus, number>;

export function countsByStatus(questions: Question[]): ReviewCounts {
  const counts: ReviewCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const question of questions) counts[question.status] += 1;
  return counts;
}

// ---------------------------------------------------------------- 모양 맞추기

const NO_STATS: QuestionStats = { total: 0, partial: 0, exact: 0 };

/** 서버가 준 것. 등급은 이미 정해져서 온다 (서버의 LevelPolicy). */
function fromServer(row: ServerQuestion, stats?: QuestionStats): RatedQuestion {
  return {
    id: row.id,
    language: row.language,
    kind: row.kind,
    masked_code: row.maskedCode,
    placeholder: row.placeholder,
    owner: row.owner,
    level: clampLevel(row.level),
    review_flags: row.reviewFlags,
    hasComment: row.hasComment,
    answerLength: row.answerLength,
    source: {
      repo: row.source.repo,
      repo_url: row.source.repoUrl,
      commit_hash: row.source.commitHash,
      file_path: row.source.filePath,
      start_line: row.source.startLine,
      end_line: row.source.endLine,
      url: row.source.url,
      license: row.source.license,
      copyright_holder: row.source.copyrightHolder,
    },
    stats: stats ?? NO_STATS,
    rated: { level: clampLevel(row.level), measured: row.measuredLevel },
  };
}

/** 파일에서 읽은 것. 등급은 여기서 정한다. */
function rateFromFile(question: Question, stats?: QuestionStats): RatedQuestion {
  const own = stats ?? NO_STATS;
  return {
    id: question.id,
    language: question.language,
    kind: question.kind,
    masked_code: question.masked_code,
    placeholder: question.placeholder,
    owner: question.owner,
    level: question.level,
    review_flags: question.review_flags,
    hasComment: Boolean(question.docstring),
    answerLength: question.answer.length,
    source: question.source,
    stats: own,
    rated: resolveLevel(question.level, own),
  };
}

/** 검수 화면이 쓰는 모양으로. 서버는 camelCase, 문제 데이터는 snake_case 다. */
function toQuestion(row: ServerReviewRow): Question {
  return {
    id: row.id,
    language: row.language,
    kind: row.kind,
    answer: row.answer,
    answer_words: row.answerWords,
    masked_code: row.maskedCode,
    placeholder: row.placeholder,
    owner: row.owner,
    docstring: row.docstring,
    level: clampLevel(row.level),
    status: row.status,
    review_flags: row.reviewFlags,
    source: {
      repo: row.source.repo,
      repo_url: row.source.repoUrl,
      commit_hash: row.source.commitHash,
      file_path: row.source.filePath,
      start_line: row.source.startLine,
      end_line: row.source.endLine,
      url: row.source.url,
      license: row.source.license,
      copyright_holder: row.source.copyrightHolder,
    },
  };
}

function clampLevel(value: number): Level {
  return Math.min(5, Math.max(0, Math.round(value))) as Level;
}
