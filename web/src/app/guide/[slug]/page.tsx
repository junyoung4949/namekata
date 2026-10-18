import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/lib/guides";
import { splitChapter, type ChapterPart } from "@/lib/chapter";
import { GuideDeck } from "@/components/GuideDeck";
import { CodeBlock } from "@/components/CodeBlock";
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

  // 본문 쪼개기는 서버에서 끝낸다. 코드 펜스를 shiki 로 토큰화해야 하는데
  // 그건 서버에서만 할 수 있고(server-only) 비동기라, 마크다운 렌더러
  // 안에서는 부를 수 없다 (lib/chapter.ts).
  const parts = await Promise.all(found.chapters.map((chapter) => splitChapter(chapter.body)));

  return (
    <GuideDeck titles={found.chapters.map((chapter) => chapter.title)}>
      {found.chapters.map((chapter, index) => (
        <article key={chapter.slug} className="chapter">
          <p className="chapter-num mono">{index + 1}</p>
          <h1 className="chapter-title">{chapter.title}</h1>
          <Body parts={parts[index]} />
        </article>
      ))}
    </GuideDeck>
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
