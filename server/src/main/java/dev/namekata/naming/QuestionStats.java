package dev.namekata.naming;

/**
 * 한 문제에 쌓인 제출 집계. {@code question_stats} 뷰가 세어 준다.
 *
 * <p>두 가지를 따로 센다. 겹침(partial)은 이 앱이 쓰는 채점 기준이고, 원본
 * 일치(exact)는 글자까지 똑같았던 수다. 난이도는 겹침으로 잰다 — 이름 짓기에
 * 정답은 없다는 게 이 앱의 입장이라, 원본을 맞혔는지보다 뜻을 짚었는지가
 * 문제의 어려움을 더 잘 나타낸다.
 */
public record QuestionStats(int total, int partial, int exact) {

    public static final QuestionStats NONE = new QuestionStats(0, 0, 0);

    /** 겹친 비율. 표본이 없으면 비어 있다 (0 으로 세면 실제보다 어려워 보인다). */
    public Double partialRate() {
        return total == 0 ? null : (double) partial / total;
    }

    /** 화면에 쓰는 퍼센트 정수. 표본이 없으면 비어 있다. */
    public Integer percent(int part) {
        return total == 0 ? null : (int) Math.round((double) part / total * 100);
    }
}
