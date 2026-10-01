package dev.namekata.question;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 문제의 언어.
 *
 * <p>Java 쪽은 대문자 상수가 관례지만 DB·JSON 에는 소문자로 오간다. 추출기와
 * 웹이 이미 소문자를 쓰고 있어서 거기를 기준으로 삼았다. 변환은 이 안에서
 * 끝내고 바깥에서는 신경 쓰지 않게 한다.
 */
public enum Language {
    JAVA("java"),
    PYTHON("python"),
    JAVASCRIPT("javascript");

    private final String code;

    Language(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static Language of(String code) {
        for (Language language : values()) {
            if (language.code.equals(code)) {
                return language;
            }
        }
        throw new IllegalArgumentException("알 수 없는 언어: " + code);
    }

    @Converter(autoApply = true)
    public static class Mapping implements AttributeConverter<Language, String> {

        @Override
        public String convertToDatabaseColumn(Language language) {
            return language == null ? null : language.code;
        }

        @Override
        public Language convertToEntityAttribute(String code) {
            return code == null ? null : of(code);
        }
    }
}
