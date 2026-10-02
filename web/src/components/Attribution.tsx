"use client";

import { useTranslations } from "next-intl";
import { requireAttribution } from "@/lib/attribution";
import type { QuestionSource } from "@/lib/types";

/**
 * 출처 표시. 설계 문서대로 제출 전부터 보여준다.
 *
 * 각주처럼 작게 둔다. 라이선스가 요구하는 것(저장소·파일·커밋·라이선스·
 * 저작권자·수정 사실)은 하나도 빼지 않되, 문제를 푸는 동안 눈에 걸리지
 * 않아야 한다. 파일 경로는 코드 위 탭에도 있으므로 여기서는 기록이다.
 *
 * 원본 링크는 커밋 해시가 붙은 고정 링크이고, 누르면 답이 보이므로
 * 한 번 확인을 받는다 (열린 질문: 막을지 허용하고 기록만 할지).
 */
export function Attribution({
  source: raw,
  onRevealAttempt,
}: {
  source: QuestionSource;
  onRevealAttempt?: () => void;
}) {
  const t = useTranslations("play");
  // 표기할 칸이 빠졌으면 코드를 보여 주지 않는다 (lib/attribution.ts 참고).
  const source = requireAttribution(raw);

  return (
    <aside className="border-t border-border pt-3 text-xs text-muted break-all">
      <a
        href={source.repoUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-4 hover:text-text"
      >
        {source.repo}
      </a>
      {" · "}
      <span className="mono">
        {source.filePath}@{source.commitHash.slice(0, 7)}
      </span>
      {" · "}
      {source.license}
      {source.copyrightHolder ? ` · ${source.copyrightHolder}` : ""}
      {" · "}
      {t("modified")}
      {" · "}
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer noopener"
        title={t("spoiler")}
        onClick={(event) => {
          if (onRevealAttempt && !window.confirm(t("spoilerConfirm"))) {
            event.preventDefault();
            return;
          }
          onRevealAttempt?.();
        }}
        className="underline underline-offset-4 hover:text-text"
      >
        {t("viewOriginal")}
      </a>
    </aside>
  );
}
