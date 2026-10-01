package dev.namekata.submission;

import dev.namekata.naming.QuestionStats;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * {@code question_stats} 뷰의 한 줄.
 *
 * <p>집계를 뷰가 하는 이유: 제출을 전부 끌어와서 세면 문제가 늘어날수록 목록 화면
 * 한 번에 오가는 양이 같이 늘어난다. 지금 113개에 제출이 몇 건씩만 붙어도 이미
 * 수백 줄이다.
 *
 * <p>{@link Immutable} 을 붙여 Hibernate 가 더티 체킹을 하지 않게 한다. 뷰라서
 * 쓸 수도 없다.
 */
@Entity
@Immutable
@Table(name = "question_stats")
public class QuestionStatsRow {

    @Id
    private String questionId;

    private long total;
    private long partial;
    private long exact;

    protected QuestionStatsRow() {
        // JPA 용
    }

    public String questionId() {
        return questionId;
    }

    public QuestionStats toStats() {
        return new QuestionStats((int) total, (int) partial, (int) exact);
    }
}
