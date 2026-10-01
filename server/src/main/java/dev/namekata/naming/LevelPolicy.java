package dev.namekata.naming;

/**
 * lv0~lv5 를 정한다.
 *
 * <p>추출기가 코드만 보고 매긴 등급으로 시작하고, 실제로 푼 사람이 충분히
 * 모인 문제는 그 결과로 덮어쓴다.
 *
 * <p>둘을 섞지 않고 갈아타는 이유: 표본이 적을 때 평균을 내면 한두 사람의
 * 답이 등급을 흔든다. 믿을 만해지는 지점을 정해 두고 그 전까지는 휴리스틱
 * 하나만 쓰는 편이 등급이 덜 튄다.
 *
 * <p>{@code web/src/lib/level.ts} 의 {@code resolveLevel} 과 같은 규칙이다.
 * 웹이 이 계산을 그만두고 서버 값을 쓰게 되면 그쪽은 지운다.
 */
public final class LevelPolicy {

    /**
     * 실측으로 갈아타는 표본 수.
     *
     * <p>20명이면 겹침률의 표준오차가 대략 ±11%p다. 등급 한 칸이 20%p 폭이니
     * 한 칸 안에서 흔들리는 정도로 들어온다.
     */
    public static final int STATS_THRESHOLD = 20;

    /** 겹침률이 높을수록 쉬운 문제다. 경계는 20%p씩 자른다. */
    private static final double[] RATE_CUTS = {0.9, 0.75, 0.6, 0.45, 0.25};

    /**
     * @param extracted 추출기가 매긴 등급 (questions.level)
     * @param stats 이 문제에 쌓인 제출. 없으면 {@link QuestionStats#NONE}
     */
    public ResolvedLevel resolve(int extracted, QuestionStats stats) {
        if (stats == null || stats.total() < STATS_THRESHOLD) {
            return ResolvedLevel.extracted(Level.clamp(extracted));
        }
        double rate = stats.partial() / (double) stats.total();
        int steps = 0;
        for (double cut : RATE_CUTS) {
            if (rate < cut) {
                steps++;
            }
        }
        return ResolvedLevel.measured(Level.clamp(steps));
    }
}
