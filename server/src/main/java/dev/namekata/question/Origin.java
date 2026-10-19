package dev.namekata.question;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * 문제가 어디서 왔는지.
 *
 * <p>출처 표기 의무가 갈리는 자리다. {@link #EXTRACTED} 는 오픈소스 코드라서
 * 저장소·커밋·파일·라이선스를 반드시 표시해야 하고, {@link #AUTHORED} 는 설명을
 * 위해 사람이 지어낸 코드라 표시할 원문이 없다.
 *
 * <p>"출처가 비었으면 자작" 으로 두지 않고 값으로 적는 이유는, 그러면 추출기
 * 버그로 출처가 빠진 문제와 자작 문제를 구분할 수 없기 때문이다. 앞은 고쳐야 할
 * 일이고 뒤는 정상이다.
 */
public enum Origin {
    EXTRACTED("extracted"),
    AUTHORED("authored");

    private final String code;

    Origin(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static Origin of(String code) {
        for (Origin origin : values()) {
            if (origin.code.equals(code)) {
                return origin;
            }
        }
        throw new IllegalArgumentException("알 수 없는 출처 구분: " + code);
    }

    @Converter(autoApply = true)
    public static class Mapping implements AttributeConverter<Origin, String> {

        @Override
        public String convertToDatabaseColumn(Origin origin) {
            return origin == null ? null : origin.code;
        }

        @Override
        public Origin convertToEntityAttribute(String code) {
            return code == null ? null : of(code);
        }
    }
}
