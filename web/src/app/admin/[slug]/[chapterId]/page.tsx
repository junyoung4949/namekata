import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, listChapters } from "@/lib/admin";
import { ChapterEditor } from "@/components/admin/ChapterEditor";
import { ChapterQuestions } from "@/components/admin/ChapterQuestions";

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

      <ChapterEditor guide={slug} chapter={chapter} />
      <ChapterQuestions guide={slug} chapter={chapter} />
    </div>
  );
}
