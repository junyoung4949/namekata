package dev.namekata.moderation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * 숨긴 답. "다른 사람의 답" 목록에서 빠진다.
 *
 * <p>제출 자체는 지우지 않는다. 집계(겹침률 → 난이도)는 그대로 세고, 보여 주기만
 * 멈춘다 — 부적절한 답을 낸 사람이 그 문제의 난이도까지 바꾸게 둘 이유는 없지만,
 * 이미 일어난 제출을 없었던 일로 만들 이유도 없다.
 */
@Entity
@Table(name = "hidden_answers")
@IdClass(HiddenAnswer.Key.class)
public class HiddenAnswer {

    @Id private String questionId;

    @Id private String name;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected HiddenAnswer() {
        // JPA 용
    }

    public HiddenAnswer(String questionId, String name) {
        this.questionId = questionId;
        this.name = name;
        this.createdAt = Instant.now();
    }

    /** 복합 키: 어느 문제의 어느 답인지. */
    public record Key(String questionId, String name) implements Serializable {

        // JPA 가 기본 생성자로 만들어 리플렉션으로 채우므로 record 에도 필요하다.
        public Key() {
            this(null, null);
        }

        @Override
        public boolean equals(Object other) {
            return other instanceof Key key
                    && Objects.equals(questionId, key.questionId)
                    && Objects.equals(name, key.name);
        }

        @Override
        public int hashCode() {
            return Objects.hash(questionId, name);
        }
    }
}
