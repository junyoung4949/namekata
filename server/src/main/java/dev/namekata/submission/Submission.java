package dev.namekata.submission;

import dev.namekata.naming.WordMatch;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * 제출 한 건. 누가 냈는지는 저장하지 않는다 (MVP 는 익명으로 받는다).
 *
 * <p>채점 결과를 함께 적어 둔다. 나중에 세려면 정답과 매번 맞춰 봐야 하는데,
 * 목록 화면이 문제 전체의 집계를 한 번에 읽으므로 읽기가 싸야 한다.
 */
@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String questionId;

    @Column(nullable = false)
    private String name;

    /** 원본과 글자까지 같았는지. */
    @Column(nullable = false)
    private boolean exact;

    /** 단어가 하나라도 겹쳤는지. 목록의 겹침률이 이것을 센다. */
    @Column(nullable = false)
    private boolean partial;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Submission() {
        // JPA 용
    }

    private Submission(String questionId, String name, boolean exact, boolean partial) {
        this.questionId = questionId;
        this.name = name;
        this.exact = exact;
        this.partial = partial;
        this.createdAt = Instant.now();
    }

    /**
     * 채점 결과에서 만든다.
     *
     * <p>exact·partial 을 바깥에서 받지 않는 이유: 그러면 클라이언트가 보낸 값을
     * 그대로 저장할 수 있게 된다. 채점은 서버가 하고, 그 결과만 여기로 들어온다.
     */
    public static Submission of(String questionId, String name, WordMatch match) {
        return new Submission(questionId, name, match.exact(), match.partial());
    }

    public String questionId() {
        return questionId;
    }

    public String name() {
        return name;
    }
}
