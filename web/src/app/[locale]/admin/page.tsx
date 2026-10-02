import { setRequestLocale } from "next-intl/server";
import { listAll } from "@/lib/questions";
import { getStore } from "@/lib/store";
import { highlight, type Highlighted } from "@/lib/highlight";
import { AdminBoard } from "@/components/AdminBoard";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [questions, reports] = await Promise.all([listAll(), getStore().listReports()]);

  // 토큰화 결과는 lib/highlight 에서 캐시된다. 승인 뒤 새로 그릴 때는 다시 계산하지 않는다.
  const highlighted: Record<string, Highlighted> = {};
  for (const question of questions) {
    highlighted[question.id] = await highlight(question.maskedCode, question.language);
  }

  return <AdminBoard questions={questions} highlighted={highlighted} reports={reports} />;
}
