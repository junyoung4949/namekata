package dev.namekata.naming;

/**
 * 화면에 내보내는 등급.
 *
 * @param level lv0~lv5
 * @param measured 실제로 푼 사람들의 결과로 정한 등급인지. 화면에서 표시를
 *     달리한다 — 추출기가 코드만 보고 짐작한 값과 구별되어야 한다.
 */
public record ResolvedLevel(Level level, boolean measured) {

    static ResolvedLevel extracted(Level level) {
        return new ResolvedLevel(level, false);
    }

    static ResolvedLevel measured(Level level) {
        return new ResolvedLevel(level, true);
    }
}
