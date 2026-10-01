package dev.namekata.admin;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 검수·import API 를 지킨다.
 *
 * <p>웹의 {@code web/src/app/api/admin/route.ts} 와 같은 규칙이다. 토큰이 설정돼
 * 있으면 {@code x-admin-token} 헤더가 맞아야 하고, 설정돼 있지 않으면 로컬에서만
 * 열린다. 운영 프로파일에서 토큰 없이 띄우면 뜨는 즉시 막는다 — "나중에
 * 채우자"가 그대로 배포되는 걸 막으려는 것이다.
 *
 * <p>Spring Security 를 쓰지 않는다. 지킬 것이 토큰 하나뿐이고, 사용자 계정이
 * 없어서 인증 체계를 둘 이유가 없다 (MVP 는 제출을 익명으로 받는다).
 */
@Component
public class AdminGuard {

    private final String expected;
    private final boolean production;

    public AdminGuard(@Value("${namekata.admin-token:}") String expected, Environment environment) {
        this.expected = expected == null ? "" : expected.trim();
        this.production = environment.matchesProfiles("prod");

        if (production && this.expected.isEmpty()) {
            throw new IllegalStateException(
                    "운영에서는 NAMEKATA_ADMIN_TOKEN 이 있어야 한다. 검수·import API 가 열린 채로 뜬다.");
        }
    }

    /**
     * @throws ResponseStatusException 401 — 토큰이 틀렸을 때
     */
    public void check(String presented) {
        if (expected.isEmpty()) {
            return; // 로컬. 생성자에서 운영은 이미 걸렀다.
        }
        if (presented == null || !constantTimeEquals(expected, presented.trim())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
        }
    }

    /** 길이와 내용 비교에 걸리는 시간이 값에 따라 달라지지 않게 한다. */
    private static boolean constantTimeEquals(String a, String b) {
        return java.security.MessageDigest.isEqual(
                a.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                b.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
