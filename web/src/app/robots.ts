import type { MetadataRoute } from "next";

/**
 * 크롤러에게 주는 안내.
 *
 * 없으면 /robots.txt 요청마다 Next 가 6KB 짜리 404 HTML 을 그려서 돌려준다.
 * 새 도메인은 인증서 투명성(CT) 로그를 통해 만들어지는 순간 공개되므로
 * 스캐너가 즉시 몰려오는데, 그 전부에게 404 페이지를 그려 주고 있었다.
 *
 * 검수 화면은 막는다. Caddy 의 비밀번호가 이미 막고 있지만, 크롤러가 굳이
 * 401 을 받아 가며 두드릴 이유가 없다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/ko/admin", "/en/admin"],
    },
  };
}
