package dev.namekata.api;

import dev.namekata.moderation.ModerationService;
import dev.namekata.naming.QuestionStats;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import dev.namekata.submission.OtherAnswer;
import dev.namekata.submission.SubmissionResult;
import dev.namekata.submission.SubmissionService;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 웹이 쓰는 공개 API.
 *
 * <p>{@code web/src/lib/store.ts} 의 {@code Store} 인터페이스를 그대로 옮겨 놓은
 * 것이다. 그쪽에 {@code HttpStore} 구현체를 붙이면 웹이 이 서버를 바라보게 된다.
 *
 * <p>정답·주석·다른 사람 답은 제출하거나 답을 열어 본 뒤에만 내려간다.
 */
@RestController
public class PublicController {

    private final QuestionRepository questions;
    private final SubmissionService submissions;
    private final ModerationService moderation;
    private final boolean allowPending;

    public PublicController(
            QuestionRepository questions,
            SubmissionService submissions,
            ModerationService moderation,
            @Value("${namekata.allow-pending:false}") boolean allowPending) {
        this.questions = questions;
        this.submissions = submissions;
        this.moderation = moderation;
        this.allowPending = allowPending;
    }

    /** 풀 수 있는 문제 목록. 정답은 빠져 있다. */
    @GetMapping("/questions")
    public List<PublicQuestion> list(@RequestParam(required = false) String language) {
        return questions.findAllLive().stream()
                .filter(question -> question.isPlayable(allowPending))
                .filter(question -> language == null || question.language().code().equals(language))
                .map(this::toPublic)
                .toList();
    }

    @GetMapping("/questions/{id}")
    public PublicQuestion one(@PathVariable String id) {
        Question question =
                questions
                        .findLiveById(id)
                        .filter(found -> found.isPlayable(allowPending))
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown question"));
        return toPublic(question);
    }

    /** 문제별 제출 집계. 목록 화면이 전체를 한 번에 읽는다. */
    @GetMapping("/questions/stats")
    public Map<String, QuestionStats> stats() {
        return submissions.allStats();
    }

    @PostMapping("/submissions")
    public SubmissionResult submit(@RequestBody SubmitRequest request) {
        return submissions.submit(request.questionId(), request.name());
    }

    /** 주석만 열어 본다. 감점은 웹이 매긴다 — 제출이 아니라서 저장하지 않는다. */
    @GetMapping("/questions/{id}/comment")
    public CommentView comment(@PathVariable String id) {
        // Map.of 는 null 값을 못 담는다. 주석이 없는 문제가 있으므로 레코드를 쓴다.
        return new CommentView(submissions.docstringOf(id));
    }

    public record CommentView(String docstring) {}

    /** 답을 보고 넘어간다. */
    @GetMapping("/questions/{id}/answer")
    public SubmissionResult reveal(@PathVariable String id) {
        return submissions.reveal(id);
    }

    @GetMapping("/questions/{id}/answers")
    public List<OtherAnswer> answers(@PathVariable String id) {
        return submissions.answersOf(id);
    }

    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void report(@RequestBody SubmitRequest request) {
        moderation.report(request.questionId(), request.name());
    }

    /**
     * 풀이 화면에 내려보내는 문제.
     *
     * <p>빼는 게 아니라 **넣을 것만 적는다.** 문제 데이터에 칸이 늘어도 실수로
     * 답이 같이 새어 나가지 않는다.
     *
     * @param answerLength 빈칸을 글자 수만큼 그리기 위해 길이만 알려 준다
     * @param hasComment 주석을 열 수 있는 문제인지. 주석 내용은 아직 안 내려간다
     */
    public record PublicQuestion(
            String id,
            String language,
            String kind,
            String maskedCode,
            String placeholder,
            String owner,
            int level,
            boolean measuredLevel,
            List<String> reviewFlags,
            boolean hasComment,
            int answerLength,
            SourceView source) {}

    public record SubmitRequest(@NotBlank String questionId, @NotBlank String name) {}

    private PublicQuestion toPublic(Question question) {
        var rated = submissions.levelOf(question);
        return new PublicQuestion(
                question.id(),
                question.language().code(),
                question.kind().code(),
                question.maskedCode(),
                question.placeholder(),
                question.owner(),
                rated.level().value(),
                rated.measured(),
                question.reviewFlags(),
                question.hasComment(),
                question.answer().length(),
                SourceView.of(question));
    }
}
