import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/lib/guides";
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
          <p className="chapter-num mono">{chapterNo}</p>
          <h1 className="chapter-title">{chapter.title}</h1>
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

  return <GuideDeck panels={panels} />;
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
