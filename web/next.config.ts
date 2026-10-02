import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// outputFileTracing 설정이 있었다. 문제 데이터를 저장소 루트의 data/ 에서
// 직접 읽던 시절, web/ 바깥 파일을 배포에 끼워 넣기 위한 것이었다. 문제가
// 서버에서 오게 되면서 web/ 밖을 읽지 않으므로 지웠다.
const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
