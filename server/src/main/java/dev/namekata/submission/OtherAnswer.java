package dev.namekata.submission;

/**
 * 다른 사람들이 낸 답 하나와 그 수.
 *
 * <p>제출한 뒤에만 내려보낸다. 풀기 전에 보이면 그게 답이 된다.
 */
public record OtherAnswer(String name, long count) {}
