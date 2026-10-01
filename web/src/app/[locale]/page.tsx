import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { allowsPending, listPlayable } from "@/lib/questions";
import { rate as toPercent } from "@/lib/level";
import { FilterDropdown, FilterOption } from "@/components/FilterDropdown";
import {
  ALL,
  DEFAULTS,
  KINDS,
  LANGUAGES,
  LEVELS,
  SORTS,
  apply,
  facet,
  isDefault,
  parseFilters,
  sort,
  toQuery,
  type Filters,
  type Params,
} from "@/lib/filters";
import { locales } from "@/i18n/routing";
import type { Language } from "@/lib/types";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tl = await getTranslations("language");

  const filters = parseFilters(await searchParams);
  const all = await listPlayable("all");
  const questions = sort(apply(all, filters), filters.sort);

  const href = (next: Filters) => ({ pathname: "/" as const, query: toQuery(next) });

  /** 드롭다운 한 칸. 고르면 그 축만 바뀐 주소로 간다. */
  const option = <K extends "lang" | "level" | "kind">(
    axis: K,
    value: Filters[K],
    label: string,
    count: number,
  ) => (
    <Link key={`${axis}-${value}`} href={href({ ...filters, [axis]: value })} className="block">
      <FilterOption active={filters[axis] === value} count={count}>
        {label}
      </FilterOption>
    </Link>
  );

  /**
   * 고른 조건을 하나씩 떼어낼 수 있게 칩으로 늘어놓는다.
   *
   * 드롭다운은 닫히면 무엇을 골랐는지 안 보인다 — 버튼에 값이 남긴
   * 하지만 세 개를 한눈에 보고 하나만 빼기에는 칩이 낫다.
   */
  const chips = [
    filters.level !== ALL && {
      key: "level",
      label: `Lv. ${filters.level}`,
      clear: href({ ...filters, level: ALL }),
    },
    filters.lang !== ALL && {
      key: "lang",
      label: tl(filters.lang),
      clear: href({ ...filters, lang: ALL }),
    },
    filters.kind !== ALL && {
      key: "kind",
      label: t(`kind.${filters.kind}`),
      clear: href({ ...filters, kind: ALL }),
    },
  ].filter((chip): chip is Exclude<typeof chip, false> => chip !== false);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted max-w-2xl">{t("lede")}</p>
      </header>

      {allowsPending() && (
        <p className="rounded-md border border-border bg-accent-soft text-accent px-3 py-2 text-xs">
          {t("pendingNotice")}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown label={t("filterLevel")} active={filters.level !== ALL}>
            {facet(all, filters, "level", [ALL, ...LEVELS]).map(({ value, count }) =>
              option("level", value, value === ALL ? t("filterAll") : `Lv. ${value}`, count),
            )}
          </FilterDropdown>

          <FilterDropdown label={t("filterLanguage")} active={filters.lang !== ALL}>
            {facet(all, filters, "lang", [ALL, ...LANGUAGES]).map(({ value, count }) =>
              option("lang", value, tl(value as Language | "all"), count),
            )}
          </FilterDropdown>

          <FilterDropdown label={t("filterKind")} active={filters.kind !== ALL}>
            {facet(all, filters, "kind", [ALL, ...KINDS]).map(({ value, count }) =>
              option("kind", value, value === ALL ? t("filterAll") : t(`kind.${value}`), count),
            )}
          </FilterDropdown>
        </div>

        {/* 정렬은 조건이 아니라 보는 방식이라 칩으로 세지 않는다. */}
        {!isDefault({ ...filters, sort: DEFAULTS.sort }) && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Link
                key={chip.key}
                href={chip.clear}
                className="inline-flex items-center gap-1.5 rounded bg-text px-2 py-1 text-xs text-bg hover:opacity-70"
              >
                {chip.label}
                <span aria-hidden="true" className="opacity-50">
                  ×
                </span>
                <span className="sr-only">{t("removeFilter")}</span>
              </Link>
            ))}
            <Link
              href={href({ ...DEFAULTS, sort: filters.sort })}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"
            >
              <ResetIcon />
              {t("reset")}
            </Link>
          </div>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="space-y-3">
          <p className="text-muted">{isDefault(filters) ? t("empty") : t("emptyFiltered")}</p>
          {!isDefault(filters) && (
            <Link href="/" className="text-sm text-accent underline underline-offset-4">
              {t("clearFilters")}
            </Link>
          )}
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">{t("listHeading", { count: questions.length })}</h2>
            <FilterDropdown label={t(`sort.${filters.sort}`)} align="right">
              {SORTS.map((value) => (
                <Link key={value} href={href({ ...filters, sort: value })} className="block">
                  <FilterOption active={filters.sort === value}>{t(`sort.${value}`)}</FilterOption>
                </Link>
              ))}
            </FilterDropdown>
          </div>

          <ul className="grid gap-2">
            {questions.map((question) => {
              const percent = toPercent(question.stats.partial, question.stats.total);
              return (
                <li key={question.id}>
                  {/* 고른 조건을 문제까지 들고 간다. 풀이 화면의 "다음 문제"가
                      이 목록의 순서를 그대로 따라가고, "목록으로"가 조건을
                      살린 채 돌아오기 위해서다. */}
                  <Link
                    href={{ pathname: `/play/${question.id}`, query: toQuery(filters) }}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-accent"
                  >
                    <span className="mono text-xs font-medium text-accent w-10 shrink-0">
                      Lv. {question.rated.level}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">
                      {tl(question.language)}
                    </span>
                    <span className="text-xs text-muted">{t(`kind.${question.kind}`)}</span>
                    <span className="mono text-sm truncate">{question.source.repo}</span>
                    {/* 표본이 없으면 자리를 비운다. 0%로 적으면 아무도 못 푼
                        문제처럼 보인다. */}
                    <span className="ml-auto text-xs text-muted tabular-nums">
                      {percent === null ? t("noStats") : t("matchRate", { percent })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M2.5 7a4.5 4.5 0 1 1 1.32 3.18M2.5 4v3h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
