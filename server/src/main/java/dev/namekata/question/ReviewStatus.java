package dev.namekata.question;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 검수 상태. 사람이 정한다.
 *
 * <p>"추출 결과에서 사라졌다"는 사실은 여기 넣지 않고 {@code retired_at} 으로
 * 따로 둔다. 승인된 문제도 소스 파일이 바뀌면 사라질 수 있어서, 둘은 서로
 * 독립이다.
 */
public enum ReviewStatus {
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected");

    private final String code;

    ReviewStatus(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static ReviewStatus of(String code) {
        for (ReviewStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        throw new IllegalArgumentException("알 수 없는 검수 상태: " + code);
    }

    @Converter(autoApply = true)
    public static class Mapping implements AttributeConverter<ReviewStatus, String> {

        @Override
        public String convertToDatabaseColumn(ReviewStatus status) {
            return status == null ? null : status.code;
        }

        @Override
        public ReviewStatus convertToEntityAttribute(String code) {
            return code == null ? null : of(code);
        }
    }
}
