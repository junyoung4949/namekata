package dev.namekata.question;

import dev.namekata.naming.Identifier;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 문제 한 건.
 *
 * <p>칸의 주인이 셋이다 (V1__baseline.sql 참고).
 *
 * <ul>
 *   <li>추출기 — import 가 매번 덮어쓴다
 *   <li>사람 — 검수 화면만 고친다. import 는 쳐다보지 않는다
 *   <li>시스템 — retiredAt, createdAt, updatedAt
 * </ul>
 *
 * <p>그래서 이 엔티티에는 추출기 칸을 바꾸는 setter 가 없다. 그쪽은
 * {@link QuestionImporter} 가 SQL 로 한 번에 처리한다. 여기서 열어 두면
 * 어느 코드가 추출기 칸을 고쳤는지 추적할 수 없게 된다.
 */
@Entity
@Table(name = "questions")
public class Question {

    @Id
    private String id;

    // ===== 추출기가 주인인 칸 =====

    @Column(nullable = false)
    private Language language;

    @Column(nullable = false)
    private Kind kind;

    @Column(nullable = false)
    private String answer;

    @Column(nullable = false)
    private String maskedCode;

    @Column(nullable = false)
    private String placeholder;

    /** 이 함수를 품은 클래스 이름. 코드 조각 바깥에 있어 따로 들고 온다. */
    private String owner;

    /** 떼어낸 원본 주석. 사용자가 감점을 받고 열면 보여준다. */
    private String docstring;

    @Column(nullable = false)
    private short level;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    private List<String> reviewFlags = List.of();

    @Embedded
    private QuestionSource source;

    // ===== 사람이 주인인 칸 =====

    @Column(nullable = false)
    private ReviewStatus status = ReviewStatus.PENDING;

    private String copyrightHolderOverride;

    // ===== 시스템이 주인인 칸 =====

    private Instant retiredAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Question() {
        // JPA 용
    }

    public String id() {
        return id;
    }

    public Language language() {
        return language;
    }

    public Kind kind() {
        return kind;
    }

    public String answer() {
        return answer;
    }

    /** 정답을 단어로 쪼갠 것. 저장하지 않고 필요할 때 계산한다. */
    public List<String> answerWords() {
        return Identifier.of(answer).words();
    }

    public String maskedCode() {
        return maskedCode;
    }

    public String placeholder() {
        return placeholder;
    }

    public String owner() {
        return owner;
    }

    public String docstring() {
        return docstring;
    }

    /** 주석을 열 수 있는 문제인지. 정답을 내려보내지 않고도 알려줄 수 있다. */
    public boolean hasComment() {
        return docstring != null && !docstring.isBlank();
    }

    public short level() {
        return level;
    }

    public List<String> reviewFlags() {
        return reviewFlags == null ? List.of() : reviewFlags;
    }

    public QuestionSource source() {
        return source;
    }

    public ReviewStatus status() {
        return status;
    }

    /**
     * 표시할 저작권자. 사람이 채운 값이 있으면 그것을 쓴다.
     *
     * <p>추출기가 읽은 값을 직접 고치게 하면 다음 import 가 지워 버린다.
     * 그래서 사람은 override 칸에 쓰고, 읽을 때 이 메서드가 고른다.
     */
    public Optional<String> effectiveCopyrightHolder() {
        if (copyrightHolderOverride != null && !copyrightHolderOverride.isBlank()) {
            return Optional.of(copyrightHolderOverride);
        }
        return Optional.ofNullable(source.copyrightHolder());
    }

    /** 추출 결과에서 사라진 문제인지. 제출 기록이 걸려 있어 지우지는 않는다. */
    public boolean isRetired() {
        return retiredAt != null;
    }

    /** 사용자에게 내보낼 문제인지. */
    public boolean isPlayable(boolean allowPending) {
        if (isRetired()) {
            return false;
        }
        return status == ReviewStatus.APPROVED || (allowPending && status == ReviewStatus.PENDING);
    }

    // ===== 사람이 하는 변경 =====

    public void review(ReviewStatus next) {
        this.status = next;
        this.updatedAt = Instant.now();
    }

    public void overrideCopyrightHolder(String holder) {
        this.copyrightHolderOverride = (holder == null || holder.isBlank()) ? null : holder.trim();
        this.updatedAt = Instant.now();
    }
}
