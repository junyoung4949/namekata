package dev.namekata.naming;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LevelPolicyTest {

    private final LevelPolicy policy = new LevelPolicy();

    @Test
    @DisplayName("표본이 모자라면 추출기가 매긴 등급을 쓴다")
    void 표본이_모자라면_추출기_등급을_쓴다() {
        // 19명까지는 휴리스틱. 한두 사람의 답으로 등급이 흔들리지 않게 한다.
        ResolvedLevel resolved = policy.resolve(3, new QuestionStats(19, 19, 19));

        assertThat(resolved.level()).isEqualTo(new Level(3));
        assertThat(resolved.measured()).isFalse();
    }

    @Test
    @DisplayName("표본이 없어도 등급은 붙는다")
    void 표본이_없어도_등급은_붙는다() {
        assertThat(policy.resolve(2, QuestionStats.NONE).level()).isEqualTo(new Level(2));
        assertThat(policy.resolve(2, null).measured()).isFalse();
    }

    @Test
    @DisplayName("표본이 차면 실측으로 갈아탄다")
    void 표본이_차면_실측으로_갈아탄다() {
        ResolvedLevel resolved = policy.resolve(0, new QuestionStats(20, 19, 5));

        // 겹침률 95% → 가장 쉬운 등급. 추출기가 매긴 0 과 우연히 같지만
        // measured 로 구별된다.
        assertThat(resolved.level()).isEqualTo(new Level(0));
        assertThat(resolved.measured()).isTrue();
    }

    @Test
    @DisplayName("겹침률이 낮을수록 어려운 등급이다")
    void 겹침률이_낮을수록_어렵다() {
        // 경계: 0.9 / 0.75 / 0.6 / 0.45 / 0.25
        assertThat(levelOf(100, 95)).isEqualTo(0); // 95% — 거의 다 맞힘
        assertThat(levelOf(100, 80)).isEqualTo(1);
        assertThat(levelOf(100, 70)).isEqualTo(2);
        assertThat(levelOf(100, 50)).isEqualTo(3);
        assertThat(levelOf(100, 30)).isEqualTo(4);
        assertThat(levelOf(100, 10)).isEqualTo(5); // 10% — 거의 못 맞힘
    }

    @Test
    @DisplayName("아무도 못 맞힌 문제는 가장 어려운 등급이다")
    void 아무도_못_맞히면_최고_난이도다() {
        assertThat(levelOf(50, 0)).isEqualTo(Level.MAX);
    }

    @Test
    @DisplayName("추출기 원점수가 범위를 넘으면 접는다")
    void 범위를_넘는_원점수는_접는다() {
        // 추출기의 원점수는 0~8까지 나올 수 있다 (estimate_level).
        assertThat(policy.resolve(8, QuestionStats.NONE).level()).isEqualTo(new Level(5));
        assertThat(policy.resolve(-1, QuestionStats.NONE).level()).isEqualTo(new Level(0));
    }

    @Test
    @DisplayName("범위 밖 등급은 만들 수 없다")
    void 범위_밖_등급은_만들_수_없다() {
        assertThatThrownBy(() -> new Level(6)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Level(-1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("표본이 없으면 비율은 비어 있다")
    void 표본이_없으면_비율은_비어_있다() {
        // 0 으로 세면 아직 아무도 안 푼 문제가 가장 어려운 문제처럼 보인다.
        assertThat(QuestionStats.NONE.partialRate()).isNull();
        assertThat(QuestionStats.NONE.percent(0)).isNull();
        assertThat(new QuestionStats(8, 2, 1).percent(2)).isEqualTo(25);
    }

    private int levelOf(int total, int partial) {
        return policy.resolve(0, new QuestionStats(total, partial, 0)).level().value();
    }
}
