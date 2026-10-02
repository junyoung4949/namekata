import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// outputFileTracing 설정이 있었다. 문제 데이터를 저장소 루트의 data/ 에서
// 직접 읽던 시절, web/ 바깥 파일을 배포에 끼워 넣기 위한 것이었다. 문제가
// 서버에서 오게 되면서 web/ 밖을 읽지 않으므로 지웠다.
const nextConfig: NextConfig = {
  // 컨테이너에 담으려면 필요하다. node_modules 전체 대신 실제로 쓰이는
  // 파일만 추려 .next/standalone 에 모아 준다 — 이미지가 수백 MB 작아지고,
  // 2GB 인스턴스에서 그 차이가 그대로 메모리 여유가 된다.
  output: "standalone",
};

export default withNextIntl(nextConfig);
