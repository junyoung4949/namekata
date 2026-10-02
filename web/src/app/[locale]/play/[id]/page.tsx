import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getQuestion, listPlayable } from "@/lib/questions";
import { apply, parseFilters, sort, toQuery, type Params } from "@/lib/filters";
import { highlight } from "@/lib/highlight";
import { PlayCard } from "@/components/PlayCard";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Params>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const question = await getQuestion(id);
  if (!question) notFound();

  // 문법 강조는 서버에서 끝낸다. 클라이언트로는 토큰과 에디터 색만 간다.
  const highlighted = await highlight(question.maskedCode, question.language);

  /*
   * 목록에서 고른 조건을 그대로 이어받는다.
   *
   * "다음 문제"는 그 조건으로 거르고 정렬한 목록의 바로 다음 칸이다.
   * 무작위로 뽑지 않는 이유: 정렬을 걸어 둔 사람은 그 순서대로 풀고
   * 싶은 것이고, 무작위는 이미 푼 문제를 다시 주기도 한다.
   *
   * 조건이 없으면 필터를 안 건 전체 목록이 그대로 순서가 된다.
   */
  const filters = parseFilters(await searchParams);
  const query = toQuery(filters);
  const pool = sort(apply(await listPlayable("all"), filters), filters.sort);

  // 주소를 직접 쳐서 들어오면 조건 밖의 문제일 수 있다. 그때는 다음이 없다.
  const at = pool.findIndex((candidate) => candidate.id === id);
  const next = at === -1 ? undefined : pool[at + 1];

  return (
    <PlayCard
      question={question}
      level={question.rated.level}
      stats={question.stats}
      highlighted={highlighted}
      listHref={withQuery("/", query)}
      nextHref={next ? withQuery(`/play/${next.id}`, query) : null}
    />
  );
}

function withQuery(pathname: string, query: Record<string, string>): string {
  const search = new URLSearchParams(query).toString();
  return search ? `${pathname}?${search}` : pathname;
}
