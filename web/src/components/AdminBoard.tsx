"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CodeBlock } from "./CodeBlock";
import type { Question, ReviewStatus } from "@/lib/types";
import type { Highlighted } from "@/lib/highlight";
import type { Report } from "@/lib/store";

const TOKEN_KEY = "namekata.adminToken";

export function AdminBoard({
  questions,
  highlighted,
  reports,
  store,
}: {
  questions: Question[];
  highlighted: Record<string, Highlighted>;
  reports: Report[];
  /** 지금 어느 저장소를 쓰는지. 안내 문구만 달라진다. */
  store: "server" | "file";
}) {
  const t = useTranslations("admin");
  const tl = useTranslations("language");
  const tk = useTranslations("home.kind");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");
  const [error, setError] = useState<string | null>(null);

  async function call(body: Record<string, unknown>) {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-admin-token": token } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      const entered = window.prompt("admin token");
      if (entered) {
        window.localStorage.setItem(TOKEN_KEY, entered);
        return call(body);
      }
      setError("unauthorized");
      return;
    }
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setError(null);
    startTransition(() => router.refresh());
  }

  const counts: Record<ReviewStatus | "all", number> = {
    all: questions.length,
    pending: questions.filter((q) => q.status === "pending").length,
    approved: questions.filter((q) => q.status === "approved").length,
    rejected: questions.filter((q) => q.status === "rejected").length,
  };
  const shown = filter === "all" ? questions : questions.filter((q) => q.status === filter);

  const label: Record<ReviewStatus, string> = {
    pending: t("statusPending"),
    approved: t("statusApproved"),
    rejected: t("statusRejected"),
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted max-w-2xl">{t("lede")}</p>
        <p className="text-xs text-muted">{store === "server" ? t("storeServer") : t("storeFile")}</p>
        {error && <p className="text-sm text-accent">{error}</p>}
      </header>

      <nav className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              key === filter
                ? "px-3 py-1 rounded-full bg-accent text-white text-sm"
                : "px-3 py-1 rounded-full border border-border text-sm text-muted hover:text-text"
            }
          >
            {key === "all" ? t("filterAll") : label[key]} · {counts[key]}
          </button>
        ))}
      </nav>

      <ul className="space-y-4">
        {shown.map((question) => (
          <li
            key={question.id}
            className="rounded-lg border border-border bg-surface p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="mono text-accent">lv{question.level}</span>
              <span className="px-2 py-0.5 rounded-full border border-border">
                {tl(question.language)}
              </span>
              <span>{tk(question.kind)}</span>
              <span>{label[question.status]}</span>
              <span className="mono truncate">{question.source.repo}</span>
              <a
                href={question.source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-4"
              >
                {question.source.file_path.split("/").pop()}
              </a>
            </div>

            <div className="text-sm">
              <span className="text-muted">{t("answerLabel")}: </span>
              <span className="mono font-medium">{question.answer}</span>
            </div>

            <details>
              <summary className="cursor-pointer text-sm text-muted">
                {question.masked_code.split("\n").length} lines
              </summary>
              <div className="pt-2">
                {highlighted[question.id] && (
                  <CodeBlock
                    highlighted={highlighted[question.id]}
                    placeholder={question.placeholder}
                    slotLength={question.answer.length}
                  />
                )}
                {question.docstring && (
                  <p className="mt-2 text-xs text-muted whitespace-pre-wrap">
                    {question.docstring.slice(0, 400)}
                  </p>
                )}
              </div>
            </details>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => call({ action: "review", questionId: question.id, status: "approved" })}
                className="rounded-md bg-match-soft text-match px-3 py-1.5 text-sm font-medium"
              >
                {t("approve")}
              </button>
              <button
                type="button"
                onClick={() => call({ action: "review", questionId: question.id, status: "rejected" })}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted"
              >
                {t("reject")}
              </button>
              <button
                type="button"
                onClick={() => call({ action: "review", questionId: question.id, status: "pending" })}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted"
              >
                {t("reset")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("reportsHeading")}</h2>
        {reports.length === 0 ? (
          <p className="text-muted text-sm">{t("reportsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {reports.map((report, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="mono">{report.name}</span>
                <span className="text-xs text-muted truncate">{report.questionId}</span>
                <button
                  type="button"
                  onClick={() =>
                    call({ action: "hide", questionId: report.questionId, name: report.name })
                  }
                  className="ml-auto text-xs underline underline-offset-4 text-muted hover:text-text"
                >
                  {t("hide")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
