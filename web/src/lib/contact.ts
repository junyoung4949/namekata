/**
 * 연락처. 푸터와 삭제 요청 화면이 같은 값을 쓴다.
 *
 * 환경 변수가 아니라 상수인 이유: 이 주소는 저작권자가 "내려달라"고 말하는
 * 창구다. 설정을 빼먹으면 조용히 닿지 않는 주소가 되는데, 그건 고지 없이
 * 코드를 내보내는 것과 같은 종류의 문제다. 기본값이 실제로 닿아야 한다.
 *
 * 도메인 주소가 생기면 NEXT_PUBLIC_TAKEDOWN_CONTACT 로 덮는다.
 */
export const TAKEDOWN_EMAIL = "about4949@gmail.com";

export function takedownContact(): string {
  return process.env.NEXT_PUBLIC_TAKEDOWN_CONTACT?.trim() || TAKEDOWN_EMAIL;
}
