/**
 * 홈. 가이드 목록이 들어올 자리다.
 *
 * 전에는 문제 목록이었다 — 레벨·언어·종류 드롭다운으로 거르고 정렬해서
 * 고르는 화면. 가이드 중심으로 바뀌면서 문제를 고르는 주체가 사용자에서
 * 가이드 저자로 넘어갔고, 그래서 필터도 정렬도 쓸 자리가 없어졌다.
 */
export default function HomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">namekata</h1>
      <p className="text-muted">가이드를 준비하고 있습니다.</p>
    </div>
  );
}
