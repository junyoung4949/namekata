package dev.namekata.naming;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AnswerLeakTest {

    @Test
    @DisplayName("가린 자리만 있으면 누출이 아니다")
    void 가렸으면_통과한다() {
        assertThat(AnswerLeak.find("public String ___NAME___(String s) { return s.trim(); }", "hasText"))
                .isEmpty();
    }

    @Test
    @DisplayName("같은 이름이 다른 표기로 남아 있으면 찾아낸다")
    void 다른_표기도_찾는다() {
        // 선언은 가려졌지만 주석·문자열에 다른 표기로 남은 경우.
        assertThat(AnswerLeak.find("// cut_leading_character 한다\nvoid ___NAME___() {}", "cutLeadingCharacter"))
                .contains("cut_leading_character");
        assertThat(AnswerLeak.find("log(\"cut-leading-character\"); void ___NAME___() {}", "cutLeadingCharacter"))
                .contains("cut-leading-character");
        assertThat(AnswerLeak.find("/* cut leading character */ void ___NAME___() {}", "cutLeadingCharacter"))
                .contains("cut leading character");
        // 대소문자는 가리지 않는다.
        assertThat(AnswerLeak.find("void ___NAME___() { CutLeadingCharacter(); }", "cutLeadingCharacter"))
                .contains("cutleadingcharacter");
    }

    @Test
    @DisplayName("재귀 호출이 남아 있으면 찾아낸다")
    void 재귀_호출을_찾는다() {
        assertThat(AnswerLeak.find("int ___NAME___(int n) { return factorial(n - 1); }", "factorial"))
                .contains("factorial");
    }

    @Test
    @DisplayName("더 긴 이름의 일부는 누출이 아니다")
    void 더_긴_이름의_일부는_넘긴다() {
        // 답이 format 인데 코드에 formatter 가 있는 경우. 답을 알려주지 않는다.
        assertThat(AnswerLeak.find("void ___NAME___() { formatter.apply(); }", "format")).isEmpty();
        // 앞에 붙는 경우도 같다.
        assertThat(AnswerLeak.find("void ___NAME___() { reformat(); }", "format")).isEmpty();
        // 밑줄로 이어진 더 긴 이름도 다른 이름이다.
        assertThat(AnswerLeak.find("void ___NAME___() { format_all(); }", "format")).isEmpty();
    }

    @Test
    @DisplayName("타입 이름과 같은 변수명은 누출이다")
    void 타입과_같은_이름은_누출이다() {
        // StringJoiner stringJoiner = ... 에서 변수명을 가려도 타입이 답을 말한다.
        assertThat(AnswerLeak.find("StringJoiner ___NAME___ = new StringJoiner(\",\");", "stringJoiner"))
                .contains("stringjoiner");
    }

    @Test
    @DisplayName("빈 입력은 누출이 아니다")
    void 빈_입력은_통과한다() {
        assertThat(AnswerLeak.find(null, "hasText")).isEmpty();
        assertThat(AnswerLeak.find("", "hasText")).isEmpty();
        assertThat(AnswerLeak.find("void ___NAME___() {}", "has space")).isEmpty();
        assertThat(AnswerLeak.find("void ___NAME___() {}", null)).isEmpty();
    }
}
