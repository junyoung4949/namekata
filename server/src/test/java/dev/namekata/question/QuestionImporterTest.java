package dev.namekata.question;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * import 의 규칙 셋을 붙들어 둔다.
 *
 * <p>이 규칙이 깨지면 조용히 깨진다. 검수 상태가 pending 으로 되돌아가거나, 제출
 * 기록이 사라진 문제를 가리키게 되는데, 둘 다 import 가 성공으로 끝난 뒤에
 * 드러난다.
 *
 * <p>로컬 Postgres 의 {@code namekata_test} 를 쓴다 (Docker 가 없어 Testcontainers
 * 를 쓰지 않는다). 없으면 {@code createdb namekata_test}.
 */
@SpringBootTest
class QuestionImporterTest {

    @Autowired private QuestionImporter importer;
    @Autowired private QuestionRepository questions;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void 비우고_시작한다() {
        jdbc.update("delete from hidden_answers");
        jdbc.update("delete from reports");
        jdbc.update("delete from submissions");
        jdbc.update("delete from questions");
    }

    @Test
    @DisplayName("같은 payload 를 두 번 보내도 결과가 같다")
    void 멱등하다() {
        ImportReport first = importer.importAll(List.of(payload("q1", "axios/axios")));
        ImportReport second = importer.importAll(List.of(payload("q1", "axios/axios")));

        assertThat(first.inserted()).isEqualTo(1);
        assertThat(second.inserted()).isZero();
        assertThat(second.updated()).isEqualTo(1);
        assertThat(questions.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("사람이 만진 칸은 import 가 덮어쓰지 않는다")
    void 사람이_만진_칸은_살아남는다() {
        importer.importAll(List.of(payload("q1", "axios/axios")));

        Question reviewed = questions.findById("q1").orElseThrow();
        reviewed.review(ReviewStatus.APPROVED);
        reviewed.overrideCopyrightHolder("검수자가 확인한 저작권자");
        questions.saveAndFlush(reviewed);

        // 추출기가 본문을 고쳐서 다시 보냈다.
        importer.importAll(List.of(payload("q1", "axios/axios", "고쳐진 코드")));

        Question after = questions.findById("q1").orElseThrow();
        assertThat(after.status()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(after.effectiveCopyrightHolder()).contains("검수자가 확인한 저작권자");
        assertThat(after.maskedCode()).isEqualTo("고쳐진 코드"); // 추출기 칸은 갱신됐다
    }

    @Test
    @DisplayName("사라진 문제는 지우지 않고 내린다")
    void 사라진_문제는_내려간다() {
        importer.importAll(
                List.of(payload("q1", "axios/axios"), payload("q2", "axios/axios")));
        // 제출이 q2 를 가리키고 있다. 지우면 이 기록이 갈 곳을 잃는다.
        jdbc.update(
                "insert into submissions (question_id, name, exact, partial) values (?, ?, ?, ?)",
                "q2", "someName", false, true);

        ImportReport report = importer.importAll(List.of(payload("q1", "axios/axios")));

        assertThat(report.retired()).isEqualTo(1);
        assertThat(report.retiredIds()).containsExactly("q2");
        assertThat(questions.count()).isEqualTo(2); // 지워지지 않았다
        assertThat(questions.findById("q2").orElseThrow().isRetired()).isTrue();
        assertThat(questions.findLiveById("q2")).isEmpty(); // 풀 수는 없다
        assertThat(jdbc.queryForObject("select count(*) from submissions", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("다시 올라온 문제는 되살아난다")
    void 다시_올라오면_되살아난다() {
        importer.importAll(
                List.of(payload("q1", "axios/axios"), payload("q2", "axios/axios")));
        importer.importAll(List.of(payload("q1", "axios/axios")));
        assertThat(questions.findById("q2").orElseThrow().isRetired()).isTrue();

        ImportReport report =
                importer.importAll(
                        List.of(payload("q1", "axios/axios"), payload("q2", "axios/axios")));

        assertThat(report.revived()).isEqualTo(1);
        assertThat(questions.findById("q2").orElseThrow().isRetired()).isFalse();
    }

    @Test
    @DisplayName("보낸 저장소 밖의 문제는 내리지 않는다")
    void 다른_저장소는_건드리지_않는다() {
        // 추출기를 소스 목록 일부로 돌릴 수 있다. 전체를 기준으로 재면 나머지
        // 저장소의 문제가 통째로 내려간다.
        importer.importAll(
                List.of(payload("axios1", "axios/axios"), payload("guava1", "google/guava")));

        ImportReport report = importer.importAll(List.of(payload("axios1", "axios/axios")));

        assertThat(report.retired()).isZero();
        assertThat(questions.findById("guava1").orElseThrow().isRetired()).isFalse();
    }

    @Test
    @DisplayName("빈 payload 는 아무것도 내리지 않는다")
    void 빈_payload는_아무것도_하지_않는다() {
        importer.importAll(List.of(payload("q1", "axios/axios")));

        ImportReport report = importer.importAll(List.of());

        assertThat(report.total()).isZero();
        assertThat(report.retired()).isZero();
        assertThat(questions.findById("q1").orElseThrow().isRetired()).isFalse();
    }

    @Test
    @DisplayName("검수 표시는 추출기 칸이라 갱신된다")
    void 검수_표시는_갱신된다() {
        importer.importAll(List.of(payload("q1", "axios/axios")));
        assertThat(questions.findById("q1").orElseThrow().reviewFlags())
                .containsExactly("주석:정답 단어가 모두 들어 있음");

        QuestionPayload cleared =
                new QuestionPayload(
                        "q1", Language.JAVASCRIPT, Kind.METHOD, "commonPrefix", "코드", "___NAME___",
                        null, null, (short) 2, List.of(), source("axios/axios"));
        importer.importAll(List.of(cleared));

        assertThat(questions.findById("q1").orElseThrow().reviewFlags()).isEmpty();
    }

    private static QuestionPayload payload(String id, String repo) {
        return payload(id, repo, "function ___NAME___(a, b) { return a; }");
    }

    private static QuestionPayload payload(String id, String repo, String maskedCode) {
        return new QuestionPayload(
                id,
                Language.JAVASCRIPT,
                Kind.METHOD,
                "commonPrefix",
                maskedCode,
                "___NAME___",
                "Utils",
                "Returns the common prefix.",
                (short) 2,
                List.of("주석:정답 단어가 모두 들어 있음"),
                source(repo));
    }

    private static QuestionPayload.Source source(String repo) {
        return new QuestionPayload.Source(
                repo, "abc1234", "lib/utils.js", 10, 20, "MIT", "Copyright (c) Someone");
    }
}
