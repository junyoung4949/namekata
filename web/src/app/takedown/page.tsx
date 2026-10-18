import { takedownContact } from "@/lib/contact";

export default function TakedownPage() {
  const contact = takedownContact();

  return (
    <article className="page space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">삭제 요청</h1>
        <p className="text-muted max-w-2xl">
          저작권자 또는 관리자이고 특정 코드의 게시를 원하지 않으시면 알려 주세요. 문제 화면
          주소나 저장소·파일 경로를 함께 보내 주시면 확인 후 내립니다.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5 space-y-1">
        <div className="text-xs text-muted">연락처</div>
        <a href={`mailto:${contact}`} className="mono underline underline-offset-4">
          {contact}
        </a>
      </section>

      <section className="space-y-1">
        <h2 className="text-lg font-medium">저장하지 않는 것</h2>
        <p className="text-muted max-w-2xl">
          커밋 작성자 이메일 등 개인정보는 수집하거나 저장하지 않습니다.
        </p>
      </section>
    </article>
  );
}
