package dev.namekata.submission;

import java.util.List;

/**
 * 제출 직후 화면에 내려보내는 것.
 *
 * <p>정답은 여기서 처음 내려간다. 문제를 내려보낼 때는 빠져 있다.
 *
 * <p>전에는 {@code docstring} 과 {@code others} 도 함께 내려갔다. 주석은 감점을 받고
 * 여는 힌트였고 others 는 다른 사람들의 답이었는데, 둘 다 없앴다 — 상황 설명은
 * 이제 사람이 쓴 {@code question_notes.brief} 가 문제를 풀기 전부터 보여 주고,
 * 남의 답은 당분간 보여주지 않는다.
 *
 * @param answer 원본 이름
 * @param answerWords 원본을 쪼갠 단어
 * @param submittedWords 제출한 이름을 쪼갠 단어
 * @param matchedWords 겹친 단어 (화면에서 색으로 표시한다)
 * @param exact 글자까지 같았는지
 */
public record SubmissionResult(
        String answer,
        List<String> answerWords,
        List<String> submittedWords,
        List<String> matchedWords,
        boolean exact) {}
