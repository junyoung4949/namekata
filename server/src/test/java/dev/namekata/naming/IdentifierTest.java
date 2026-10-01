package dev.namekata.naming;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

class IdentifierTest {

    @Test
    @DisplayName("단어 쪼개기가 추출기(Python)와 글자 하나까지 같다")
    void 단어_쪼개기가_추출기와_같다() throws Exception {
        // split-words-golden.json 은 tools/extract 의 split_words 가 직접 뽑은 값이다.
        //
        //   .venv/bin/python -c "import sys; sys.path.insert(0,'tools/extract'); ..."
        //
        // 규칙이 Python·TypeScript·Java 세 곳에 있어서, 어긋나면 화면에 보이는
        // 겹침과 저장되는 겹침이 달라진다. 이 테스트가 그걸 잡는다.
        Map<String, List<String>> golden = readGolden();
        assertThat(golden).hasSizeGreaterThan(100);

        golden.forEach((name, expected) ->
                assertThat(Identifier.of(name).words())
                        .as("%s 를 쪼갠 결과", name)
                        .isEqualTo(expected));
    }

    @Test
    @DisplayName("연속 대문자 약어는 한 단어로 묶는다")
    void 약어는_한_단어다() {
        assertThat(Identifier.of("buildURL").words()).containsExactly("build", "url");
        assertThat(Identifier.of("trimOWS").words()).containsExactly("trim", "ows");
        // 약어 뒤에 단어가 붙으면 마지막 대문자는 그 단어 것이다.
        assertThat(Identifier.of("HTTPSConnection").words()).containsExactly("https", "connection");
        assertThat(Identifier.of("parseURLString").words()).containsExactly("parse", "url", "string");
    }

    @Test
    @DisplayName("이름 끝의 숫자는 앞 단어에 붙는다")
    void 끝의_숫자는_앞_단어에_붙는다() {
        // len1 을 len + 1 로 가르지 않는다. 추출기가 이런 이름을 아예 문제로
        // 쓰지 않지만(NUMBERED_RE), 사용자는 제출할 수 있다.
        assertThat(Identifier.of("len1").words()).containsExactly("len1");
    }

    @Test
    @DisplayName("식별자로 쓸 수 없는 모양은 거부한다")
    void 모양이_틀리면_거부한다() {
        assertThat(Identifier.parse(null)).isEmpty();
        assertThat(Identifier.parse("   ")).isEmpty();
        assertThat(Identifier.parse("1stPlace")).isEmpty(); // 숫자로 시작
        assertThat(Identifier.parse("has space")).isEmpty();
        assertThat(Identifier.parse("kebab-case")).isEmpty();
        assertThat(Identifier.parse("a".repeat(61))).isEmpty(); // 이름이 아니라 문장
        assertThat(Identifier.parse("a".repeat(60))).isPresent();

        assertThatThrownBy(() -> Identifier.of("has space"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("앞뒤 공백은 떼고 만든다")
    void 공백은_떼어낸다() {
        assertThat(Identifier.of("  getUserName  ").text()).isEqualTo("getUserName");
        // 공백만 다른 제출은 같은 답으로 묶여야 한다.
        assertThat(Identifier.of(" flush ")).isEqualTo(Identifier.of("flush"));
    }

    @Test
    @DisplayName("단어가 겹치면 그 단어들을 돌려준다")
    void 겹치는_단어를_센다() {
        WordMatch match = Identifier.of("getUserName").against(Identifier.of("findUserName"));

        assertThat(match.matchedWords()).containsExactly("user", "name");
        assertThat(match.submittedWords()).containsExactly("get", "user", "name");
        assertThat(match.answerWords()).containsExactly("find", "user", "name");
        assertThat(match.partial()).isTrue();
        assertThat(match.exact()).isFalse();
    }

    @Test
    @DisplayName("표기만 다른 답도 단어는 전부 겹친다")
    void 표기가_달라도_단어는_겹친다() {
        WordMatch match = Identifier.of("get_user_name").against(Identifier.of("getUserName"));

        assertThat(match.matchedWords()).containsExactly("get", "user", "name");
        assertThat(match.partial()).isTrue();
        // 겹침은 전부지만 원본 일치는 아니다. 목록에는 겹침률을 쓴다.
        assertThat(match.exact()).isFalse();
    }

    @Test
    @DisplayName("같은 단어를 더 많이 적어도 정답에 있는 만큼만 센다")
    void 중복_단어는_정답에_있는_만큼만_센다() {
        // name 이 두 번 있는 제출. 정답에는 하나뿐이라 하나만 맞은 것이다.
        WordMatch match = Identifier.of("userNameName").against(Identifier.of("userName"));

        assertThat(match.matchedWords()).containsExactly("user", "name");
    }

    @Test
    @DisplayName("겹치는 단어가 없으면 partial 도 아니다")
    void 하나도_안_겹치면_partial이_아니다() {
        WordMatch match = Identifier.of("foo").against(Identifier.of("commonPrefix"));

        assertThat(match.matchedWords()).isEmpty();
        assertThat(match.partial()).isFalse();
        assertThat(match.exact()).isFalse();
    }

    @Test
    @DisplayName("글자까지 같으면 exact 다")
    void 글자까지_같으면_exact다() {
        WordMatch match = Identifier.of("commonPrefix").against(Identifier.of("commonPrefix"));

        assertThat(match.exact()).isTrue();
        assertThat(match.partial()).isTrue();
    }

    private Map<String, List<String>> readGolden() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/split-words-golden.json")) {
            assertThat(in).as("split-words-golden.json 이 테스트 자원에 있어야 한다").isNotNull();
            return new ObjectMapper().readValue(in, new TypeReference<Map<String, List<String>>>() {});
        }
    }
}
