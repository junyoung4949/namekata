package dev.namekata.submission;

import dev.namekata.naming.Identifier;
import dev.namekata.naming.WordMatch;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 제출을 받고 채점한다.
 *
 * <p>채점이 서버에 있는 것은 브라우저가 보낸 채점 결과를 믿지 않기 위해서다.
 *
 * <p>읽는 길은 전부 걷어냈다. 집계({@code question_stats} 뷰)는 목록 화면의 겹침률과
 * 실측 등급에만 쓰였는데 둘 다 사라졌고, 다른 사람들의 답도 당분간 보여주지 않는다.
 * 제출 기록 자체는 계속 쌓는다 — 나중에 되살릴 수 없는 데이터다.
 */
@Service
public class SubmissionService {

    private final QuestionRepository questions;
    private final SubmissionRepository submissions;

    public SubmissionService(QuestionRepository questions, SubmissionRepository submissions) {
        this.questions = questions;
        this.submissions = submissions;
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
                match.exact());
    }

    /** 답을 보고 넘어간다. 제출이 아니므로 저장하지 않는다. */
    @Transactional(readOnly = true)
    public SubmissionResult reveal(String questionId) {
        Question question = findLive(questionId);
        return new SubmissionResult(
                question.answer(), question.answerWords(), List.of(), List.of(), false);
    }

    private Question findLive(String questionId) {
        return questions
                .findLiveById(questionId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown question"));
    }
}
