# 의존성 — package-lock.json 만 바뀔 때 다시 받는다.
FROM node:22-slim AS deps
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /src
COPY --from=deps /src/node_modules node_modules
COPY . .

# 빌드할 때도 값이 있어야 한다. 문제를 읽는 페이지는 모두 요청 시점에
# 그려지므로 빌드 중 호출은 나가지 않지만, lib/api.ts 가 값이 없으면 던진다.
# 실제 주소는 실행할 때 환경변수로 들어온다.
ENV NAMEKATA_API_URL=http://server:8080

# NEXT_PUBLIC_ 로 시작하는 값은 브라우저로 나가므로 **빌드할 때** 번들에 박힌다.
# 실행 시점 환경변수로는 바뀌지 않는다 — 그래서 build arg 로 받는다.
ARG NEXT_PUBLIC_GA_ID=
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

RUN npx next build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

RUN useradd --system --create-home --shell /usr/sbin/nologin app

# standalone 출력은 실제로 쓰이는 파일만 모아 둔 것이다 (next.config.ts 참고).
# node_modules 를 통째로 들고 오지 않으므로 이미지가 수백 MB 작다.
COPY --from=build --chown=app:app /src/.next/standalone ./
COPY --from=build --chown=app:app /src/.next/static ./.next/static
COPY --from=build --chown=app:app /src/public ./public

USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
