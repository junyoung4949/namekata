package dev.namekata.question;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * 문제의 출처.
 *
 * <p>커밋 해시로 고정해 두는 것이 핵심이다. 허용적 라이선스 코드를 쓰는 대신
 * 어느 저장소의 어느 커밋 어느 줄에서 가져왔는지를 증명할 수 있어야 한다.
 *
 * <p>{@code repoUrl} 과 {@code url} 은 저장하지 않고 여기서 만든다. 두 벌로
 * 두면 한쪽만 갱신되는 순간 어긋나기 시작한다.
 *
 * <p>칸이 전부 비어 있을 수 있다. 사람이 쓴 문제(Origin.AUTHORED)에는 표기할
 * 원문이 없기 때문이다. 비었는지는 {@link #isPresent()} 로 묻는다 — 추출된
 * 문제에 출처가 있다는 보장은 DB 제약이 지킨다 (V4__authored_questions.sql).
 */
@Embeddable
public class QuestionSource {

    private static final String GITHUB = "https://github.com/";

    private String repo;

    private String commitHash;

    private String filePath;

    private Integer startLine;

    private Integer endLine;

    private String license;

    /** 파일 헤더나 LICENSE 에서 읽은 저작권자. 못 찾으면 비어 있다. */
    private String copyrightHolder;

    protected QuestionSource() {
        // JPA 용
    }

    public QuestionSource(
            String repo,
            String commitHash,
            String filePath,
            Integer startLine,
            Integer endLine,
            String license,
            String copyrightHolder) {
        this.repo = repo;
        this.commitHash = commitHash;
        this.filePath = filePath;
        this.startLine = startLine;
        this.endLine = endLine;
        this.license = license;
        this.copyrightHolder = copyrightHolder;
    }

    public String repo() {
        return repo;
    }

    public String commitHash() {
        return commitHash;
    }

    public String filePath() {
        return filePath;
    }

    public Integer startLine() {
        return startLine;
    }

    public Integer endLine() {
        return endLine;
    }

    public String license() {
        return license;
    }

    public String copyrightHolder() {
        return copyrightHolder;
    }

    /** 표기할 것이 있는지. 없으면 화면이 출처 줄을 아예 그리지 않는다. */
    public boolean isPresent() {
        return repo != null && !repo.isBlank();
    }

    public String repoUrl() {
        return isPresent() ? GITHUB + repo : null;
    }

    /** 원본 코드의 그 줄로 바로 가는 주소. 출처 표시에서 쓴다. */
    public String url() {
        if (!isPresent()) {
            return null;
        }
        if (startLine == null || endLine == null) {
            return "%s%s/blob/%s/%s".formatted(GITHUB, repo, commitHash, filePath);
        }
        return "%s%s/blob/%s/%s#L%d-L%d".formatted(GITHUB, repo, commitHash, filePath, startLine, endLine);
    }
}
