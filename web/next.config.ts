import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// 문제 데이터는 저장소 루트의 data/ 에 있다 (추출기가 만드는 산출물).
// 추적 기준을 저장소 루트로 올려야 web/ 바깥 파일을 배포에 포함할 수 있다.
const repoRoot = path.join(import.meta.dirname, "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/**": ["data/**"],
  },
};

export default withNextIntl(nextConfig);
