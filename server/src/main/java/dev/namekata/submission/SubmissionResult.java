package dev.namekata.submission;

import java.util.List;

/**
 * 제출 직후 화면에 내려보내는 것.
 *
 * <p>정답과 주석은 여기서 처음 내려간다. 문제를 내려보낼 때는 빠져 있다.
 *
 * @param answer 원본 이름
 * @param answerWords 원본을 쪼갠 단어
 * @param submittedWords 제출한 이름을 쪼갠 단어
 * @param matchedWords 겹친 단어 (화면에서 색으로 표시한다)
 * @param exact 글자까지 같았는지
 * @param docstring 떼어내 둔 원본 주석
 * @param others 다른 사람들의 답
 */
public record SubmissionResult(
        String answer,
        List<String> answerWords,
        List<String> submittedWords,
        List<String> matchedWords,
        boolean exact,
        String docstring,
        List<OtherAnswer> others) {}
