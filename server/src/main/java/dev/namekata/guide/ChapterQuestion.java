package dev.namekata.guide;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Converter;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/**
 * 장과 문제를 잇는다. 방향이 둘이라 {@link Role} 로 가른다.
 *
 * <ul>
 *   <li>{@code practice} — 이 장 끝에 붙는 연습 문제. 순서가 있다
 *   <li>{@code reference} — 이 문제의 해설이 가리키는 장. 순서가 없다
 * </ul>
 *
 * <p>테이블을 둘로 나누지 않은 것은 모양이 같아서다. 쓰는 쪽은 role 로
 * 거르면 되고, 역방향 조회는 {@code (question_id, role)} 인덱스가 받는다.
 */
@Entity
@Table(name = "chapter_questions")
public class ChapterQuestion {

    @EmbeddedId
    private Key key;

    /**
     * {@code practice} 일 때 연습 순서.
     *
     * <p>{@code reference} 는 0 으로 둔다. null 로 두면 "순서 없음" 이라는 뜻이
     * null 에 얹히고, 정렬할 때마다 그 약속을 기억해야 한다.
     */
    @Column(nullable = false)
    private int position;

    protected ChapterQuestion() {
        // JPA 용
    }

    public ChapterQuestion(long chapterId, String questionId, Role role, int position) {
        this.key = new Key(chapterId, questionId, role);
        this.position = position;
    }

    public long chapterId() {
        return key.chapterId();
    }

    public String questionId() {
        return key.questionId();
    }

    public Role role() {
        return key.role();
    }

    public int position() {
        return position;
    }

    public void moveTo(int position) {
        this.position = position;
    }

    @Embeddable
    public static class Key implements Serializable {

        @Column(nullable = false)
        private Long chapterId;

        @Column(nullable = false)
        private String questionId;

        @Column(nullable = false)
        private Role role;

        protected Key() {
            // JPA 용
        }

        Key(long chapterId, String questionId, Role role) {
            this.chapterId = chapterId;
            this.questionId = questionId;
            this.role = role;
        }

        long chapterId() {
            return chapterId;
        }

        String questionId() {
            return questionId;
        }

        Role role() {
            return role;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            return other instanceof Key key
                    && Objects.equals(chapterId, key.chapterId)
                    && Objects.equals(questionId, key.questionId)
                    && role == key.role;
        }

        @Override
        public int hashCode() {
            return Objects.hash(chapterId, questionId, role);
        }
    }

    /** 장과 문제가 어떤 사이인지. */
    public enum Role {
        PRACTICE("practice"),
        REFERENCE("reference");

        private final String code;

        Role(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }

        @JsonCreator
        public static Role of(String code) {
            for (Role role : values()) {
                if (role.code.equals(code)) {
                    return role;
                }
            }
            throw new IllegalArgumentException("알 수 없는 연결 종류: " + code);
        }

        @Converter(autoApply = true)
        public static class Mapping implements AttributeConverter<Role, String> {

            @Override
            public String convertToDatabaseColumn(Role role) {
                return role == null ? null : role.code;
            }

            @Override
            public Role convertToEntityAttribute(String code) {
                return code == null ? null : of(code);
            }
        }
    }
}
