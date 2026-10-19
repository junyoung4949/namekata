import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide, languageLabel, type GuideCard } from "@/lib/guides";
import { splitChapter, type ChapterPart } from "@/lib/chapter";
import { highlight } from "@/lib/highlight";
import { GuideDeck, type DeckPanel } from "@/components/GuideDeck";
import { CodeBlock } from "@/components/CodeBlock";
import { PracticePanel } from "@/components/PracticePanel";
import { Prose } from "@/components/Prose";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) return { title: "namekata" };
  return {
    title: `${found.guide.title} · namekata`,
    description: found.guide.lede ?? undefined,
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) notFound();

  /*
   * 판을 미리 다 만든다 — 장 하나와 거기 붙은 연습 문제들이 번갈아 놓인다.
   *
   * 문법 강조는 서버에서 끝낸다. 장 본문의 코드 펜스도, 연습 문제의 코드도
   * 같은 highlight.ts 를 거치므로 둘이 똑같이 보인다. 클라이언트로는 토큰과
   * 에디터 색만 간다.
   */
  const panels: DeckPanel[] = [];
  let chapterNo = 0;

  for (const chapter of found.chapters) {
    chapterNo += 1;
    const parts = await splitChapter(chapter.body);

    panels.push({
      title: chapter.title,
      label: String(chapterNo),
      kind: "chapter",
      node: (
        <article className="chapter">
          {/*
            장 제목은 크게 걸지 않는다. 한 판에 한 장이고 오른쪽 탭이 지금
            어디인지 늘 보여 주므로, 제목은 "여기가 어디인지" 확인하는
            이정표면 충분하다. 자리를 본문에 내준다.
          */}
          <p className="chapter-eyebrow">
            <span className="chapter-num mono">{chapterNo}</span>
            {chapter.title}
          </p>
          <Body parts={parts} />
        </article>
      ),
    });

    for (const question of chapter.practice) {
      panels.push({
        title: `${chapter.title} — 연습`,
        label: "✎",
        kind: "practice",
        node: (
          <PracticePanel
            question={question}
            highlighted={await highlight(question.maskedCode, question.language)}
          />
        ),
      });
    }
  }

  return (
    <div className="guide">
      <header className="guide-head">
        <span className="guide-lang">{languageLabel(found.guide.language)}</span>
        <h1 className="guide-title">{found.guide.title}</h1>
      </header>

      <GuideDeck panels={panels} footer={<Credit guide={found.guide} />} />
    </div>
  );
}

/**
 * 출처 표기.
 *
 * 아래 줄에 작게 깐다. 번역을 싣는 이상 빠질 수 없는 것이지만(구글
 * 스타일가이드는 CC-BY 3.0 이라 저작자 표시와 개작 사실 명시를 요구한다)
 * 읽는 데 끼어들 이유는 없다. 늘 보이되 눈에 걸리지 않는 자리가 여기다.
 */
function Credit({ guide }: { guide: GuideCard }) {
  if (!guide.source?.url) return <span className="deck-credit" />;

  return (
    <span className="deck-credit">
      <a href={guide.source.url} target="_blank" rel="noreferrer noopener">
        원문{guide.source.title ? ` ${guide.source.title}` : ""} ↗
      </a>
      {guide.source.license && ` · ${guide.source.license} · 한국어 번역`}
    </span>
  );
}

function Body({ parts }: { parts: ChapterPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "prose" ? (
          <Prose key={index}>{part.text}</Prose>
        ) : (
          <div key={index} className="chapter-code">
            <CodeBlock highlighted={part.highlighted} />
          </div>
        ),
      )}
    </>
  );
}
