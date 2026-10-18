package dev.namekata.guide;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * 가이드가 다루는 언어.
 *
 * <p>{@code question.Language} 와 값이 다르다. 여기에만 {@link #COMMON} 이 있다 —
 * 네이밍 치트시트처럼 언어를 가리지 않는 가이드가 있기 때문이다. 반대로 문제는
 * 반드시 어떤 언어로 쓰인 코드라서 공통이 없다. 도메인이 일부러 다르므로 두
 * 열거형을 합치지 않는다.
 *
 * <p>"공통" 을 null 로 두지 않은 이유: 그러면 {@code where language = 'java'} 가
 * 공통 가이드를 조용히 빼먹는다. 범주는 값으로 적는다.
 */
public enum GuideLanguage {
    COMMON("common"),
    JAVA("java"),
    PYTHON("python"),
    JAVASCRIPT("javascript");

    private final String code;

    GuideLanguage(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static GuideLanguage of(String code) {
        for (GuideLanguage language : values()) {
            if (language.code.equals(code)) {
                return language;
            }
        }
        throw new IllegalArgumentException("알 수 없는 가이드 언어: " + code);
    }

    @Converter(autoApply = true)
    public static class Mapping implements AttributeConverter<GuideLanguage, String> {

        @Override
        public String convertToDatabaseColumn(GuideLanguage language) {
            return language == null ? null : language.code;
        }

        @Override
        public GuideLanguage convertToEntityAttribute(String code) {
            return code == null ? null : of(code);
        }
    }
}
