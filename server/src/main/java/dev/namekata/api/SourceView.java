package dev.namekata.api;

import dev.namekata.question.Question;

/**
 * 화면에 내보내는 출처.
 *
 * <p>{@code repoUrl} 과 {@code url} 은 저장돼 있지 않고 {@link dev.namekata.question.QuestionSource}
 * 가 만들어 준다. 저작권자도 사람이 채운 값이 있으면 그쪽이 나온다.
 *
 * <p>풀이 화면과 검수 화면이 같은 모양을 쓴다. 출처 표기는 라이선스 의무라서,
 * 두 화면이 다른 걸 보여 주면 어느 쪽이 맞는지 알 수 없게 된다.
 */
public record SourceView(
        String repo,
        String repoUrl,
        String commitHash,
        String filePath,
        Integer startLine,
        Integer endLine,
        String url,
        String license,
        String copyrightHolder) {

    /**
     * @return 표기할 출처가 없으면 {@code null}. 사람이 쓴 문제(Origin.AUTHORED)가
     *     그렇다 — 지어낸 예시 코드에는 표시할 원문이 없다
     */
    public static SourceView of(Question question) {
        var source = question.source();
        if (source == null || !source.isPresent()) {
            return null;
        }
        return new SourceView(
                source.repo(),
                source.repoUrl(),
                source.commitHash(),
                source.filePath(),
                source.startLine(),
                source.endLine(),
                source.url(),
                source.license(),
                question.effectiveCopyrightHolder().orElse(null));
    }
}
