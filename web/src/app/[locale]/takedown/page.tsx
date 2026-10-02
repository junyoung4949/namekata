import { getTranslations, setRequestLocale } from "next-intl/server";
import { takedownContact } from "@/lib/contact";

export default async function TakedownPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("takedown");

  const contact = takedownContact();

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted max-w-2xl">{t("body")}</p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5 space-y-1">
        <div className="text-xs text-muted">{t("emailLabel")}</div>
        <a href={`mailto:${contact}`} className="mono underline underline-offset-4">
          {contact}
        </a>
      </section>

      <section className="space-y-1">
        <h2 className="text-lg font-medium">{t("privacyHeading")}</h2>
        <p className="text-muted max-w-2xl">{t("privacyBody")}</p>
      </section>
    </article>
  );
}
