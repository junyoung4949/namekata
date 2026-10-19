package dev.namekata.guide;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** 가이드 공개 여부. {@link #DRAFT} 는 홈 목록에 뜨지 않는다. */
public enum GuideStatus {
    DRAFT("draft"),
    PUBLISHED("published");

    private final String code;

    GuideStatus(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static GuideStatus of(String code) {
        for (GuideStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        throw new IllegalArgumentException("알 수 없는 가이드 상태: " + code);
    }

    @Converter(autoApply = true)
    public static class Mapping implements AttributeConverter<GuideStatus, String> {

        @Override
        public String convertToDatabaseColumn(GuideStatus status) {
            return status == null ? null : status.code;
        }

        @Override
        public GuideStatus convertToEntityAttribute(String code) {
            return code == null ? null : of(code);
        }
    }
}
