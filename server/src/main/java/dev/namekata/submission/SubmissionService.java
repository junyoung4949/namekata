package dev.namekata.submission;

import dev.namekata.naming.Identifier;
import dev.namekata.naming.LevelPolicy;
import dev.namekata.naming.QuestionStats;
import dev.namekata.naming.ResolvedLevel;
import dev.namekata.naming.WordMatch;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 제출을 받고 채점한다.
 *
 * <p>채점이 서버로 올라온 것이 웹에서 하던 때와 가장 다른 점이다. 전에는
 * 브라우저가 겹침 여부를 계산해 보내고 그 값을 그대로 저장했다
 * ({@code web/src/app/api/submissions/route.ts}). 집계가 난이도로 쓰이고 난이도가
 * 목록 정렬에 쓰이니, 보내온 값을 믿으면 아무나 등급을 흔들 수 있다.
 */
@Service
public class SubmissionService {

    private final QuestionRepository questions;
    private final SubmissionRepository submissions;
    private final QuestionStatsRepository stats;
    private final LevelPolicy levelPolicy;

    public SubmissionService(
            QuestionRepository questions,
            SubmissionRepository submissions,
            QuestionStatsRepository stats,
            LevelPolicy levelPolicy) {
        this.questions = questions;
        this.submissions = submissions;
        this.stats = stats;
        this.levelPolicy = levelPolicy;
    }

    @Transactional
    public SubmissionResult submit(String questionId, String rawName) {
        Identifier submitted =
                Identifier.parse(rawName)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST, "invalid submission"));

        Question question = findLive(questionId);
        WordMatch match = submitted.against(Identifier.of(question.answer()));

        submissions.save(Submission.of(questionId, submitted.text(), match));

        return new SubmissionResult(
                question.answer(),
                match.answerWords(),
                match.submittedWords(),
                match.matchedWords(),
                match.exact(),
                question.docstring(),
                answersOf(questionId));
    }

    @Transactional(readOnly = true)
    public List<OtherAnswer> answersOf(String questionId) {
        return submissions.findAnswers(questionId).stream()
                .map(row -> new OtherAnswer(row.getName(), row.getCount()))
                .toList();
    }

    /** 문제별 집계. 목록 화면이 전체를 한 번에 쓴다. */
    @Transactional(readOnly = true)
    public Map<String, QuestionStats> allStats() {
        Map<String, QuestionStats> byQuestion = new HashMap<>();
        for (QuestionStatsRow row : stats.findAll()) {
            byQuestion.put(row.questionId(), row.toStats());
        }
        return byQuestion;
    }

    /** 표본이 차면 실측으로 덮은 등급. */
    @Transactional(readOnly = true)
    public ResolvedLevel levelOf(Question question) {
        QuestionStats own =
                stats.findById(question.id()).map(QuestionStatsRow::toStats).orElse(QuestionStats.NONE);
        return levelPolicy.resolve(question.level(), own);
    }

    /** 주석만 열어 본다. 제출이 아니라서 저장하지 않는다. */
    @Transactional(readOnly = true)
    public String docstringOf(String questionId) {
        return findLive(questionId).docstring();
    }

    /**
     * 답을 보고 넘어간다. 제출이 아니므로 저장하지 않는다.
     *
     * <p>다른 사람들의 답은 함께 내려보낸다 — 답을 본 뒤에는 감출 이유가 없다.
     */
    @Transactional(readOnly = true)
    public SubmissionResult reveal(String questionId) {
        Question question = findLive(questionId);
        return new SubmissionResult(
                question.answer(),
                question.answerWords(),
                List.of(),
                List.of(),
                false,
                question.docstring(),
                answersOf(questionId));
    }

    private Question findLive(String questionId) {
        return questions
                .findLiveById(questionId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown question"));
    }
}
