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
 */
@Embeddable
public class QuestionSource {

    private static final String GITHUB = "https://github.com/";

    @Column(nullable = false)
    private String repo;

    @Column(nullable = false)
    private String commitHash;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private int startLine;

    @Column(nullable = false)
    private int endLine;

    @Column(nullable = false)
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
            int startLine,
            int endLine,
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

    public int startLine() {
        return startLine;
    }

    public int endLine() {
        return endLine;
    }

    public String license() {
        return license;
    }

    public String copyrightHolder() {
        return copyrightHolder;
    }

    public String repoUrl() {
        return GITHUB + repo;
    }

    /** 원본 코드의 그 줄로 바로 가는 주소. 출처 표시에서 쓴다. */
    public String url() {
        return "%s%s/blob/%s/%s#L%d-L%d".formatted(GITHUB, repo, commitHash, filePath, startLine, endLine);
    }
}
