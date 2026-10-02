package dev.namekata.naming;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 단어 쪼개기와 채점의 규칙.
 *
 * <p>전에는 여기에 추출기(Python)의 {@code split_words} 가 뽑아 준 이름 119개를
 * 담은 골든 파일과, 그것과 글자까지 같은지 보는 테스트가 있었다. 지웠다.
 *
 * <p>두 쪼개기는 **같아야 하는 계약이 아니다.** Java 의 것은 채점에 쓰이고 —
 * 제출한 이름은 실행 중에 들어오므로 미리 쪼갤 수 없어서 여기 있어야 한다 —
 * Python 의 것은 누출 변형을 만들고 난이도를 가늠하는 내부 어림짐작이다. 어긋나도
 * 채점은 양쪽(정답·제출)을 같은 자로 재므로 결과가 틀리지 않는다.
 *
 * <p>게다가 골든 파일은 "옛날에 Python 이 뭐라고 했는지"의 사진이라, Python 을
 * 고치고 다시 뽑지 않으면 낡은 값에 대해 통과했다. 지키는 것이 계약이 아닌데
 * 지키는 방법마저 사람의 기억에 달려 있던 장치다.
 *
 * <p>골든 파일에만 있던 경계 사례는 아래 테스트에 직접 적어 두었다. 파일을 읽지
 * 않으니 무엇을 기대하는지 읽는 자리에서 바로 보인다.
 */
class IdentifierTest {

    @Test
    @DisplayName("연속 대문자 약어는 한 단어로 묶는다")
    void 약어는_한_단어다() {
        assertThat(Identifier.of("buildURL").words()).containsExactly("build", "url");
        assertThat(Identifier.of("trimOWS").words()).containsExactly("trim", "ows");
        assertThat(Identifier.of("getID").words()).containsExactly("get", "id");
        // 약어가 이름 앞에 올 때도 묶는다.
        assertThat(Identifier.of("IOError").words()).containsExactly("io", "error");
        assertThat(Identifier.of("OWSHeader").words()).containsExactly("ows", "header");
        // 약어 뒤에 단어가 붙으면 마지막 대문자는 그 단어 것이다.
        assertThat(Identifier.of("HTTPSConnection").words()).containsExactly("https", "connection");
        assertThat(Identifier.of("parseURLString").words()).containsExactly("parse", "url", "string");
        // 약어가 둘 연달아 오는 경우.
        assertThat(Identifier.of("XMLHttpRequest").words()).containsExactly("xml", "http", "request");
    }

    @Test
    @DisplayName("밑줄은 단어 경계다")
    void 밑줄은_단어_경계다() {
        assertThat(Identifier.of("to_json").words()).containsExactly("to", "json");
        assertThat(Identifier.of("snake_case_name").words()).containsExactly("snake", "case", "name");
        // 한 글자씩만 있어도 각각 단어다.
        assertThat(Identifier.of("a_b_c").words()).containsExactly("a", "b", "c");
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
}
