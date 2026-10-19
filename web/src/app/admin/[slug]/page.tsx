import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, listChapters } from "@/lib/admin";
import { GuideSettings } from "@/components/admin/GuideSettings";
import { GuideOutline } from "@/components/admin/GuideOutline";

export const dynamic = "force-dynamic";

export default async function AdminGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [guide, chapters] = await Promise.all([getGuide(slug), listChapters(slug).catch(() => [])]);
  if (!guide) notFound();

  return (
    <div className="page space-y-8">
      <header className="space-y-2">
        <Link href="/admin" className="text-xs text-muted hover:text-text">
          ← 가이드 목록
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{guide.title}</h1>
          <span className="mono text-xs text-muted">{guide.slug}</span>
          {guide.status === "published" && (
            <Link href={`/guide/${guide.slug}`} className="text-xs text-accent underline underline-offset-4">
              사이트에서 보기 ↗
            </Link>
          )}
        </div>
      </header>

      <GuideOutline guide={guide.slug} chapters={chapters} />
      <GuideSettings guide={guide} />
    </div>
  );
}
