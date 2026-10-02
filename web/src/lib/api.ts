/**
 * Spring Boot 서버로 나가는 창구.
 *
 * 서버 주소는 NAMEKATA_API_URL 로 준다. 반드시 있어야 한다 — 전에는 없으면
 * 파일 저장소로 떨어졌지만 그 길을 지웠다 (lib/store.ts 참고).
 *
 * 모든 호출은 Next 서버에서만 일어난다. 브라우저가 Spring 을 직접 부르지
 * 않는 이유는 관리자 토큰이 서버에만 있어야 하기 때문이다 — 토큰을
 * NEXT_PUBLIC_ 으로 내보내면 검수 API 가 누구에게나 열린다.
 */

export function apiBase(): string | null {
  const url = process.env.NAMEKATA_API_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = {
  method?: "GET" | "POST";
  body?: unknown;
  /** 관리자 토큰을 같이 보낸다. 검수·import API 가 요구한다. */
  admin?: boolean;
  /**
   * 응답을 얼마나 오래 재사용할지(초). 기본은 재사용하지 않음.
   *
   * 문제 본문은 import 할 때만 바뀌므로 짧게 캐시해도 되지만, 검수에서
   * 승인한 결과가 바로 보여야 해서 기본값은 꺼 둔다.
   */
  revalidate?: number;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const base = apiBase();
  if (!base) {
    throw new Error("NAMEKATA_API_URL 이 없다. 서버 저장소를 쓰려면 설정해야 한다.");
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.admin) {
    const token = process.env.NAMEKATA_ADMIN_TOKEN;
    if (token) headers["x-admin-token"] = token;
  }

  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: options.revalidate === undefined ? "no-store" : undefined,
    next: options.revalidate === undefined ? undefined : { revalidate: options.revalidate },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `${options.method ?? "GET"} ${path} → ${response.status}`);
  }

  // 204 No Content 나 빈 본문.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
