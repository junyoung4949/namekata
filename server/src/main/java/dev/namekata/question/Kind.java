package dev.namekata.question;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 무엇의 이름을 묻는 문제인지.
 *
 * <p>{@code CLASS} 는 설계에만 있고 추출기가 아직 만들지 않는다. 미리 넣어 둔
 * 이유는 DB 의 check 제약과 맞춰 두면 추출기가 내보내기 시작할 때 마이그레이션
 * 없이 받을 수 있기 때문이다.
 */
public enum Kind {
    METHOD("method"),
    VARIABLE("variable"),
    CLASS("class");

    private final String code;

    Kind(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static Kind of(String code) {
        for (Kind kind : values()) {
            if (kind.code.equals(code)) {
                return kind;
            }
        }
        throw new IllegalArgumentException("알 수 없는 종류: " + code);
    }

    @Converter(autoApply = true)
    public static class Mapping implements AttributeConverter<Kind, String> {

        @Override
        public String convertToDatabaseColumn(Kind kind) {
            return kind == null ? null : kind.code;
        }

        @Override
        public Kind convertToEntityAttribute(String code) {
            return code == null ? null : of(code);
        }
    }
}
