package dev.namekata.api;

import dev.namekata.guide.PracticeNotes;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import dev.namekata.submission.SubmissionResult;
import dev.namekata.submission.SubmissionService;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 웹이 쓰는 공개 API.
 *
 * <p>정답은 제출하거나 답을 열어 본 뒤에만 내려간다.
 *
 * <p>걷어낸 것들 — 집계({@code /questions/stats})는 목록 화면의 겹침률과 실측 등급에
 * 쓰였는데 둘 다 사라졌고, 주석 열기({@code /questions/{id}/comment})는 사람이 쓴
 * 상황 설명으로 대체됐으며, 다른 사람들의 답({@code /questions/{id}/answers})과
 * 신고({@code /reports})는 당분간 쓰지 않는다.
 *
 * <p>검수 상태로 거르지도 않는다. 문제를 고르는 일은 이제 가이드 저자가 장에
 * 붙이면서 한다 — 그 선택이 곧 승인이라, 따로 승인 단계를 두면 같은 판단을 두 번
 * 하게 된다. 내려간 문제(retired)만 빠진다.
 */
@RestController
public class PublicController {

    private final QuestionRepository questions;
    private final SubmissionService submissions;
    private final PracticeNotes notes;

    public PublicController(
            QuestionRepository questions, SubmissionService submissions, PracticeNotes notes) {
        this.questions = questions;
        this.submissions = submissions;
        this.notes = notes;
    }

    /** 풀 수 있는 문제 목록. 정답은 빠져 있다. */
    @GetMapping("/questions")
    public List<PublicQuestion> list(@RequestParam(required = false) String language) {
        return questions.findAllLive().stream()
                .filter(question -> language == null || question.language().code().equals(language))
                .map(PublicController::toPublic)
                .toList();
    }

    @GetMapping("/questions/{id}")
    public PublicQuestion one(@PathVariable String id) {
        Question question =
                questions
                        .findLiveById(id)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown question"));
        return toPublic(question);
    }

    @PostMapping("/submissions")
    public PracticeResult submit(@RequestBody SubmitRequest request) {
        return explain(request.questionId(), submissions.submit(request.questionId(), request.name()));
    }

    /** 답을 보고 넘어간다. 제출이 아니므로 저장하지 않는다. */
    @GetMapping("/questions/{id}/answer")
    public PracticeResult reveal(@PathVariable String id) {
        return explain(id, submissions.reveal(id));
    }

    /**
     * 풀이 화면에 내려보내는 문제.
     *
     * <p>빼는 게 아니라 **넣을 것만 적는다.** 문제 데이터에 칸이 늘어도 실수로
     * 답이 같이 새어 나가지 않는다.
     *
     * @param answerLength 빈칸을 글자 수만큼 그리기 위해 길이만 알려 준다
     */
    public record PublicQuestion(
            String id,
            String language,
            String kind,
            String maskedCode,
            String placeholder,
            String owner,
            int level,
            List<String> reviewFlags,
            int answerLength,
            SourceView source) {}

    public record SubmitRequest(@NotBlank String questionId, @NotBlank String name) {}

    /**
     * 제출 직후 화면에 내려보내는 것 — 채점 결과에 해설을 얹었다.
     *
     * <p>해설은 제출한 뒤에만 내려간다. 답 단어를 그대로 설명하는 글이라 문제와
     * 함께 보내면 답이 새기 때문이다. 반대로 상황 설명(brief)은 풀기 전부터
     * 보여 주므로 가이드를 읽을 때 같이 간다.
     *
     * @param rationale 원저자가 어떤 원칙으로 이 이름을 지었는지. 안 썼으면 null
     * @param references 해설이 가리키는 장
     */
    public record PracticeResult(
            String answer,
            List<String> answerWords,
            List<String> submittedWords,
            List<String> matchedWords,
            boolean exact,
            String rationale,
            List<PracticeNotes.ChapterRef> references) {}

    private PracticeResult explain(String questionId, SubmissionResult graded) {
        PracticeNotes.Explanation explanation = notes.of(questionId);
        return new PracticeResult(
                graded.answer(),
                graded.answerWords(),
                graded.submittedWords(),
                graded.matchedWords(),
                graded.exact(),
                explanation.rationale(),
                explanation.references());
    }

    private static PublicQuestion toPublic(Question question) {
        return new PublicQuestion(
                question.id(),
                question.language().code(),
                question.kind().code(),
                question.maskedCode(),
                question.placeholder(),
                question.owner(),
                question.level(),
                question.reviewFlags(),
                question.answer().length(),
                SourceView.of(question));
    }
}
