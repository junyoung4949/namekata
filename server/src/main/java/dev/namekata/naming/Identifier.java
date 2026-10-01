package dev.namekata.naming;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 식별자 하나. 사용자가 제출한 이름이거나, 문제의 정답이다.
 *
 * <p>문자열로 들고 다니면 "이미 검증했는지", "trim 했는지"를 호출하는 쪽마다
 * 다시 걱정해야 한다. 만들 때 한 번 확인하고, 그 뒤로는 이 타입이 보증한다.
 *
 * <p>단어로 쪼개는 규칙은 세 곳에서 같아야 한다.
 *
 * <ul>
 *   <li>{@code tools/extract/extract.py} 의 {@code split_words} — 문제의 answer_words
 *   <li>{@code web/src/lib/scoring.ts} 의 {@code splitWords} — 입력하는 동안의 미리보기
 *   <li>이 클래스 — 저장되는 채점 결과
 * </ul>
 *
 * <p>세 벌이 어긋나면 화면에 보이는 겹침과 저장된 겹침이 달라진다. 규칙이
 * 정규식 한 줄이라 두고 있지만, 바꿀 때는 셋을 같이 바꾸고 테스트를 돌려야
 * 한다 ({@code IdentifierTest} 가 세 곳이 합의한 예를 붙들고 있다).
 *
 * <p>이름을 역할별로 칠하는 일({@code web/src/lib/role.ts})은 웹에 남겼다.
 * 입력하는 동안 매번 쓰이는 표시라 서버를 왕복할 일이 아니고, 그쪽 단어
 * 목록은 아직 자주 바뀐다.
 */
public final class Identifier {

    /** camelCase·snake_case·연속 대문자 약어(URL, OWS)를 가른다. */
    private static final Pattern WORD = Pattern.compile("[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+");

    /** 식별자로 쓸 수 있는 모양인지. */
    private static final Pattern SHAPE = Pattern.compile("[A-Za-z_$][A-Za-z0-9_$]*");

    /** 이보다 긴 이름은 이름이 아니라 문장이다. */
    private static final int MAX_LENGTH = 60;

    private final String text;
    private final List<String> words;

    private Identifier(String text) {
        this.text = text;
        this.words = splitWords(text);
    }

    /**
     * 앞뒤 공백을 떼고 만든다.
     *
     * @throws IllegalArgumentException 식별자로 쓸 수 없는 모양일 때
     */
    public static Identifier of(String raw) {
        return parse(raw)
                .orElseThrow(() -> new IllegalArgumentException("식별자로 쓸 수 없는 이름: " + raw));
    }

    /** 사용자 입력처럼 믿을 수 없는 값에 쓴다. 모양이 틀리면 빈 값이 나온다. */
    public static Optional<Identifier> parse(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_LENGTH || !SHAPE.matcher(trimmed).matches()) {
            return Optional.empty();
        }
        return Optional.of(new Identifier(trimmed));
    }

    public String text() {
        return text;
    }

    /** 소문자로 맞춘 단어 목록. 채점의 단위다. */
    public List<String> words() {
        return words;
    }

    /**
     * 정답과 견준다.
     *
     * <p>단어가 몇 개 겹치는지를 센다. 이름 짓기에 정답은 없다는 게 이 앱의
     * 입장이라, 글자까지 같은지(exact)는 따로 두고 목록에는 겹침을 쓴다.
     */
    public WordMatch against(Identifier answer) {
        // 같은 단어가 두 번 나오는 이름(getUserUserId)에서 한 번만 세려고
        // 쓴 것에서 덜어낸다. pool.remove 는 처음 하나만 지운다.
        List<String> pool = new ArrayList<>(answer.words());
        List<String> matched = new ArrayList<>();
        for (String word : words) {
            if (pool.remove(word)) {
                matched.add(word);
            }
        }
        return new WordMatch(words, answer.words(), List.copyOf(matched), text.equals(answer.text()));
    }

    private static List<String> splitWords(String name) {
        List<String> found = new ArrayList<>();
        var matcher = WORD.matcher(name);
        while (matcher.find()) {
            found.add(matcher.group().toLowerCase());
        }
        return Collections.unmodifiableList(found);
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof Identifier that && text.equals(that.text);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(text);
    }

    @Override
    public String toString() {
        return text;
    }
}
