package dev.namekata.api;

import dev.namekata.admin.AdminGuard;
import dev.namekata.moderation.ModerationService;
import dev.namekata.moderation.Report;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import dev.namekata.question.ReviewStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 검수 화면이 쓰는 API.
 *
 * <p>문제 상태가 {@code questions.status} 한 칸이 되어서, 전에 있던
 * {@code question_reviews} 테이블은 없앴다. 문제가 파일에 있을 때는 상태를 따로
 * 둘 수밖에 없었다.
 */
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminGuard guard;
    private final QuestionRepository questions;
    private final ModerationService moderation;

    public AdminController(
            AdminGuard guard, QuestionRepository questions, ModerationService moderation) {
        this.guard = guard;
        this.questions = questions;
        this.moderation = moderation;
    }

    /**
     * 검수 대상 전부. 내려간 것까지 포함한다.
     *
     * @param flaggedOnly 자동 검사가 확신하지 못한 문제만. 이것부터 보는 게 효율이 좋다
     */
    @GetMapping("/questions")
    public List<ReviewRow> list(
            @RequestHeader(name = "x-admin-token", required = false) String token,
            @RequestParam(defaultValue = "false") boolean flaggedOnly) {
        guard.check(token);
        List<Question> found = flaggedOnly ? questions.findFlagged() : questions.findAllForReview();
        return found.stream().map(AdminController::toRow).toList();
    }

    @PostMapping("/questions/{id}/review")
    @ResponseStatus(HttpStatus.OK)
    public ReviewRow review(
            @RequestHeader(name = "x-admin-token", required = false) String token,
            @PathVariable String id,
            @RequestBody ReviewRequest request) {
        guard.check(token);
        Question question = find(id);
        question.review(request.status());
        return toRow(questions.save(question));
    }

    /**
     * 추출기가 저작권자를 못 찾았거나 잘못 읽었을 때 사람이 채운다.
     *
     * <p>추출기가 읽은 칸을 직접 고치지 않고 별도 칸에 쓴다. 그렇게 하지 않으면
     * 다음 import 가 지워 버린다.
     */
    @PostMapping("/questions/{id}/copyright")
    @ResponseStatus(HttpStatus.OK)
    public ReviewRow overrideCopyright(
            @RequestHeader(name = "x-admin-token", required = false) String token,
            @PathVariable String id,
            @RequestBody CopyrightRequest request) {
        guard.check(token);
        Question question = find(id);
        question.overrideCopyrightHolder(request.copyrightHolder());
        return toRow(questions.save(question));
    }

    @PostMapping("/questions/{id}/hide")
    @ResponseStatus(HttpStatus.OK)
    public void hide(
            @RequestHeader(name = "x-admin-token", required = false) String token,
            @PathVariable String id,
            @RequestBody HideRequest request) {
        guard.check(token);
        moderation.hide(id, request.name());
    }

    @GetMapping("/reports")
    public List<ReportRow> reports(
            @RequestHeader(name = "x-admin-token", required = false) String token) {
        guard.check(token);
        return moderation.recentReports().stream()
                .map(report -> new ReportRow(report.questionId(), report.name(), report.createdAt()))
                .toList();
    }

    private Question find(String id) {
        return questions
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown question"));
    }

    /** 검수 화면에 필요한 것. 여기서는 정답도 보여 준다 — 그게 검수할 대상이다. */
    public record ReviewRow(
            String id,
            String language,
            String kind,
            String answer,
            List<String> answerWords,
            String maskedCode,
            String placeholder,
            String owner,
            String docstring,
            String status,
            int level,
            List<String> reviewFlags,
            boolean retired,
            SourceView source) {}

    public record ReportRow(String questionId, String name, Instant at) {}

    public record ReviewRequest(ReviewStatus status) {}

    public record CopyrightRequest(String copyrightHolder) {}

    public record HideRequest(String name) {}

    private static ReviewRow toRow(Question question) {
        return new ReviewRow(
                question.id(),
                question.language().code(),
                question.kind().code(),
                question.answer(),
                question.answerWords(),
                question.maskedCode(),
                question.placeholder(),
                question.owner(),
                question.docstring(),
                question.status().code(),
                question.level(),
                question.reviewFlags(),
                question.isRetired(),
                SourceView.of(question));
    }
}
