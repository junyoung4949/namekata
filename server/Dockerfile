# 빌드 단계. 여기서 만든 jar 만 아래로 넘긴다 — Gradle·JDK·소스는 최종
# 이미지에 들어가지 않는다 (이미지가 작아지고, 공격면도 줄어든다).
FROM gradle:9-jdk21 AS build
WORKDIR /src

# 의존성 선언만 먼저 복사해서 받아 둔다. 소스만 고쳤을 때 이 층이 캐시에
# 남아 재빌드가 빨라진다.
COPY gradle gradle
COPY gradlew settings.gradle.kts build.gradle.kts ./
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src src
# 테스트는 건너뛴다. 진짜 Postgres 가 필요해서 빌드 중에는 못 돌린다 —
# CI(.github/workflows/ci.yml)가 서비스 컨테이너를 띄워서 돌린다.
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app

# root 로 돌리지 않는다.
RUN useradd --system --create-home --shell /usr/sbin/nologin app
USER app

COPY --from=build /src/build/libs/*.jar app.jar

# 2GB 인스턴스에 셋이 함께 산다. JVM 이 "램의 1/4" 기본값으로 힙을 잡으면
# 컨테이너 한도를 넘겨 OOM 으로 죽는다. 실측(힙 86MB·사용 51MB)에 여유를
# 둬서 못박는다.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
