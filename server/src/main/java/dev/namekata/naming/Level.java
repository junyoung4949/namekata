package dev.namekata.naming;

/**
 * lv0~lv5. 범위 밖 값이 화면까지 흘러가지 않게 타입으로 막는다.
 *
 * <p>추출기의 원점수는 0~8까지 나올 수 있고, 실측 쪽은 경계 개수를 센 값이다.
 * 양쪽 다 이 타입을 거쳐야 하므로 접는 자리를 한 곳으로 모았다.
 */
public record Level(int value) implements Comparable<Level> {

    public static final int MIN = 0;
    public static final int MAX = 5;

    public Level {
        if (value < MIN || value > MAX) {
            throw new IllegalArgumentException("등급은 %d~%d 사이여야 한다: %d".formatted(MIN, MAX, value));
        }
    }

    /** 범위 밖 값을 양 끝으로 접는다. */
    public static Level clamp(int raw) {
        return new Level(Math.min(MAX, Math.max(MIN, raw)));
    }

    @Override
    public int compareTo(Level other) {
        return Integer.compare(value, other.value);
    }

    @Override
    public String toString() {
        return "lv" + value;
    }
}
