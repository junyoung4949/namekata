package dev.namekata.naming;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 코드에서 이름을 가린다.
 *
 * <p>추출기(tools/extract)가 tree-sitter 로 하는 일을 사람이 쓴 문제에 대해서만
 * 글자 단위로 한다. 파서를 쓰지 않는 이유는 붙여넣은 코드가 잘린 조각일 수 있어서다 —
 * 메서드 하나만 떼어 온 코드는 많은 경우 그 자체로는 파싱되지 않는다.
 *
 * <p>대신 글자로만 하면 놓치는 것이 있다. 문자열이나 주석 안의 같은 글자도 함께
 * 가려진다. 그게 문제가 되는 자리는 드물고, 되더라도 답을 더 가리는 쪽이라
 * 누출보다는 낫다.
 *
 * <p>가린 뒤에는 {@link AnswerLeak} 이 한 번 더 본다. 여기 정규식이 틀려서 남은
 * 표기가 있으면 거기서 걸린다 — 같은 성질을 다른 구현으로 확인하는 것이다.
 */
public final class Masking {

    /** 화면이 빈칸을 그릴 자리 표시. 추출기가 쓰는 것과 같다. */
    public static final String PLACEHOLDER = "___NAME___";

    private Masking() {}

    /**
     * 이름이 통째로 한 단어로 나오는 자리를 전부 가린다.
     *
     * <p>앞뒤가 식별자 글자면 더 긴 이름의 일부이므로 건드리지 않는다. 답이
     * {@code get} 일 때 {@code getter} 를 가리면 코드가 망가진다.
     */
    public static String hide(String code, String name) {
        if (code == null || name == null || name.isBlank()) {
            return code;
        }
        Pattern pattern =
                Pattern.compile("(?<![A-Za-z0-9_$])" + Pattern.quote(name) + "(?![A-Za-z0-9_$])");
        return pattern.matcher(code).replaceAll(Matcher.quoteReplacement(PLACEHOLDER));
    }

    /** 가린 뒤에도 답이 보이는지. 값이 있으면 그 표기가 코드에 남아 있다. */
    public static Optional<String> leak(String maskedCode, String name) {
        return AnswerLeak.find(maskedCode, name);
    }
}
