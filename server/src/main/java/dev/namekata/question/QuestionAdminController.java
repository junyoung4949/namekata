package dev.namekata.question;

import com.fasterxml.jackson.annotation.JsonProperty;
import dev.namekata.admin.AdminGuard;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 문제를 집어넣는 창구.
 *
 * <p>추출기(Python)가 GitHub Actions 에서 돌고, 결과를 이 엔드포인트로 보낸다.
 * 추출기를 서버에서 돌리지 않는 이유:
 *
 * <ul>
 *   <li>tree-sitter 문법은 Python 쪽 생태계가 압도적으로 낫다 (pip 한 줄 대 플랫폼별
 *       네이티브 라이브러리)
 *   <li>추출은 몇 분 걸린다. HTTP 요청 안에서 돌릴 수 없고, 비동기 잡 관리를 직접
 *       해야 한다. GitHub Actions 가 그걸 대신한다
 *   <li>추출기는 GitHub API 와 raw 를 때린다. Actions 는 그 네트워크 안에 있다
 * </ul>
 *
 * <p>멱등하다. 같은 payload 를 두 번 보내면 두 번째는 updated 만 올라간다.
 */
@RestController
@RequestMapping("/admin/questions")
public class QuestionAdminController {

    private static final Logger log = LoggerFactory.getLogger(QuestionAdminController.class);

    private final AdminGuard guard;
    private final QuestionImporter importer;
    private final QuestionRepository questions;

    public QuestionAdminController(
            AdminGuard guard, QuestionImporter importer, QuestionRepository questions) {
        this.guard = guard;
        this.importer = importer;
        this.questions = questions;
    }

    /**
     * 추출기가 커밋을 고정하는 데 쓰는 최소 정보.
     *
     * <p>추출기는 {@code --pin-from} 에 지난 결과 파일을 받아 "이 문제들이 쓰던
     * 커밋을 그대로 써라"로 쓴다. 그 파일을 레포에 두면 저장소를 새로 추가할 때
     * 문제가 생긴다 — 1회차가 고정한 커밋을 어디에도 남기지 않으면 2회차가 최신
     * 커밋을 다시 물어서 그 저장소의 문제 id 가 통째로 갈린다.
     *
     * <p>이미 DB가 커밋과 id 를 들고 있으므로 거기서 내보낸다. 모양은 추출기의
     * {@code read_pinned_commits}/{@code read_pinned_ids} 가 읽는 것과 같게 맞췄다.
     *
     * <p>내려간 문제도 포함한다. 되살아날 수 있어야 하므로 커밋이 유지되어야 한다.
     */
    @GetMapping("/pins")
    public List<Pin> pins(
            @RequestHeader(name = "x-admin-token", required = false) String token) {
        guard.check(token);
        return questions.findAllForReview().stream()
                .map(
                        question ->
                                new Pin(
                                        question.id(),
                                        new Pin.Source(
                                                question.source().repo(),
                                                question.source().commitHash())))
                .toList();
    }

    /** 추출기가 읽는 최소 모양. 칸 이름이 snake_case 인 것은 그쪽 규칙이다. */
    public record Pin(String id, Source source) {
        public record Source(String repo, @JsonProperty("commit_hash") String commitHash) {}
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.OK)
    public ImportReport importQuestions(
            @RequestHeader(name = "x-admin-token", required = false) String token,
            @RequestBody @Valid @NotEmpty List<@Valid QuestionPayload> payloads) {
        guard.check(token);

        ImportReport report = importer.importAll(payloads);
        log.info(
                "문제 import: 신규 {} · 갱신 {} · 내림 {} · 되살림 {}",
                report.inserted(),
                report.updated(),
                report.retired(),
                report.revived());
        if (report.retired() > 0) {
            // 평소 추출은 커밋을 고정해 돌리므로 문제가 사라지지 않는다. 내려간 게
            // 있으면 소스 목록이 줄었거나 필터가 조여진 것이고, 그 문제에 걸려
            // 있던 제출 기록은 더 이상 풀 수 없는 문제를 가리킨다.
            log.warn("내려간 문제 {}개: {}", report.retired(), report.retiredIds());
        }
        if (!report.rejected().isEmpty()) {
            // 추출기의 가리기가 샜다. 추출기 쪽 _name_variants 를 봐야 한다.
            log.error("답이 보여서 받지 않은 문제 {}개: {}", report.rejected().size(), report.rejected());
        }
        return report;
    }
}
