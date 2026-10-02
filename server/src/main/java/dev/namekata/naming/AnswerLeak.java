package dev.namekata.naming;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 가려 놓은 답이 코드에 그대로 보이는지 찾는다.
 *
 * <p>추출기도 같은 일을 한다 (tools/extract 의 {@code _name_variants}). 그런데 왜 또
 * 하는가 — <b>같은 성질을 서로 다른 구현으로 확인하는 것</b>이기 때문이다. 복식부기와
 * 같다. 추출기의 단어 쪼개기가 틀리면 만들어야 할 변형을 못 만들어서 누출을 놓치는데,
 * 그걸 잡아 줄 사람이 지금은 검수자뿐이다. 문제 수백 개를 눈으로 훑는 일에 기대는
 * 대신, 들어오는 문제 전부를 여기서 한 번 더 본다.
 *
 * <p><b>이것은 "두 쪼개기가 같은가"를 보는 것이 아니다.</b> 그건 지켜야 할 계약이
 * 아니고, 강제하면 결합만 늘어난다. 여기서 보는 것은 "답이 가려졌는가"라는 결과이고,
 * 그건 둘 중 누가 맞든 참이어야 하는 성질이다.
 *
 * <p>통째로 한 단어로 나올 때만 누출로 본다. 더 긴 이름의 일부로 들어 있는 것은
 * (예: 답이 {@code format} 인데 코드에 {@code formatter} 가 있는 경우) 답을 알려주지
 * 않으므로 그냥 둔다 — 그런 자리는 추출기가 review_flags 로 표시해 검수로 넘긴다.
 */
public final class AnswerLeak {

    /**
     * 식별자를 이루는 글자. 앞뒤가 이 글자면 더 긴 이름의 일부이므로 누출이 아니다.
     *
     * <p>검사는 전부 소문자로 내려놓고 하므로 대문자는 넣지 않는다.
     */
    private static final String IDENTIFIER_CHAR = "[a-z0-9_$]";

    private AnswerLeak() {}

    /**
     * 코드에 그대로 보이는 답의 표기를 찾는다.
     *
     * @return 보이는 표기 (없으면 empty). 어떤 모양으로 보였는지가 고치는 데 쓰인다
     */
    public static Optional<String> find(String maskedCode, String answer) {
        if (maskedCode == null || maskedCode.isEmpty()) {
            return Optional.empty();
        }
        Optional<Identifier> parsed = Identifier.parse(answer);
        if (parsed.isEmpty()) {
            // 식별자 모양이 아니면 문제가 될 수 없다. payload 검증이 따로 막는다.
            return Optional.empty();
        }

        String haystack = maskedCode.toLowerCase(Locale.ROOT);
        for (String variant : variants(parsed.get())) {
            if (appearsAsWord(variant, haystack)) {
                return Optional.of(variant);
            }
        }
        return Optional.empty();
    }

    /**
     * 같은 이름의 여러 표기.
     *
     * <p>{@code cutLeadingCharacter} 를 가렸는데 주석이나 문자열에
     * {@code cut_leading_character} 로 남아 있으면 답을 알려준 것과 같다.
     */
    private static Set<String> variants(Identifier answer) {
        List<String> words = answer.words();
        Set<String> out = new LinkedHashSet<>();
        out.add(answer.text().toLowerCase(Locale.ROOT));
        out.add(String.join("", words));
        out.add(String.join("_", words));
        out.add(String.join("-", words));
        out.add(String.join(" ", words));
        out.removeIf(String::isEmpty);
        return out;
    }

    private static boolean appearsAsWord(String needle, String haystack) {
        Pattern pattern =
                Pattern.compile(
                        "(?<!" + IDENTIFIER_CHAR + ")" + Pattern.quote(needle) + "(?!" + IDENTIFIER_CHAR + ")");
        return pattern.matcher(haystack).find();
    }
}
