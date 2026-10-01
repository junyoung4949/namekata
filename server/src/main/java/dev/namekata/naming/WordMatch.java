package dev.namekata.naming;

import java.util.List;

/**
 * 채점 한 건.
 *
 * <p>제출할 때 한 번 계산해서 {@code submissions} 에 함께 저장한다. 나중에
 * 세려면 정답과 매번 맞춰 봐야 하는데, 목록 화면이 문제 전체의 집계를 한
 * 번에 읽으므로 읽기가 싸야 한다.
 *
 * @param submittedWords 제출한 이름을 쪼갠 단어
 * @param answerWords 원본 이름을 쪼갠 단어
 * @param matchedWords 둘에 함께 있던 단어 (화면에서 색으로 표시한다)
 * @param exact 글자까지 똑같았는지
 */
public record WordMatch(
        List<String> submittedWords,
        List<String> answerWords,
        List<String> matchedWords,
        boolean exact) {

    /** 단어가 하나라도 겹쳤는지. 목록 화면의 겹침률이 이것을 센다. */
    public boolean partial() {
        return !matchedWords.isEmpty();
    }
}
