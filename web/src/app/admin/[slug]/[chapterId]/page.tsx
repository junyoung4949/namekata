import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, listChapters } from "@/lib/admin";
import { ChapterEditor } from "@/components/admin/ChapterEditor";

export const dynamic = "force-dynamic";

export default async function AdminChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterId: string }>;
}) {
  const { slug, chapterId } = await params;
  const id = Number(chapterId);

  const [guide, chapters] = await Promise.all([getGuide(slug), listChapters(slug).catch(() => [])]);
  const chapter = chapters.find((row) => row.id === id);
  if (!guide || !chapter) notFound();

  const at = chapters.findIndex((row) => row.id === id);

  return (
    <div className="page space-y-8">
      <header className="space-y-2">
        <Link href={`/admin/${slug}`} className="text-xs text-muted hover:text-text">
          ← {guide.title}
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="mono text-xs text-accent">{at + 1}장</span>
          <h1 className="text-2xl font-semibold tracking-tight">{chapter.title}</h1>
        </div>
      </header>

      {/*
        문제는 여기서 붙이지 않는다. 가이드 화면의 한 목록에서 장과 문제를
        함께 쌓는다 — 글 쓰는 흐름이 "장 쓰고 → 문제 만들고 → 다음 장" 이라,
        장 안으로 들어와야 문제를 붙일 수 있으면 그 흐름이 매번 끊긴다.
      */}
      <ChapterEditor guide={slug} chapter={chapter} />
    </div>
  );
}
