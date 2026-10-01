import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // API와 정적 자산은 그대로 두고, 나머지 경로만 언어 접두어를 붙인다.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
