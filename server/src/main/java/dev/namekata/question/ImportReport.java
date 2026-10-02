package dev.namekata.question;

import java.util.List;

/**
 * import 한 번의 결과.
 *
 * <p>{@code retired} 와 {@code revived} 를 따로 돌려주는 이유는, 이 숫자가 크면
 * 뭔가 잘못됐다는 신호이기 때문이다. 평소 추출은 커밋을 고정해 돌리므로 문제가
 * 사라지지 않는다. 한꺼번에 수십 개가 retired 로 넘어갔다면 소스 목록이 줄었거나
 * 필터가 조여진 것이고, 그 문제들에 걸려 있던 제출 기록은 더 이상 풀 수 없는
 * 문제를 가리키게 된다.
 *
 * @param inserted 처음 들어온 문제
 * @param updated 이미 있던 문제 (추출기 칸만 갱신됐다)
 * @param retired 이번 추출 결과에 없어서 내려간 문제
 * @param revived 전에 내려갔다가 다시 올라온 문제
 * @param retiredIds 내려간 문제의 id. 적을 때는 그대로 돌려줘서 확인할 수 있게 한다
 * @param rejected 답이 코드에 보여서 받지 않은 문제. 평소에는 비어 있다
 */
public record ImportReport(
        int inserted,
        int updated,
        int retired,
        int revived,
        List<String> retiredIds,
        List<Rejected> rejected) {

    /** 이 수를 넘으면 id 목록은 생략한다. 응답이 쓸데없이 커진다. */
    private static final int ID_LIMIT = 50;

    /**
     * 받지 않은 문제 하나.
     *
     * @param id 문제 id
     * @param reason 사람이 읽고 바로 고칠 수 있는 설명. 어떤 표기가 보였는지까지 담는다
     */
    public record Rejected(String id, String reason) {}

    public static ImportReport of(
            int inserted,
            int updated,
            int revived,
            List<String> retiredIds,
            List<Rejected> rejected) {
        List<String> shown = retiredIds.size() <= ID_LIMIT ? List.copyOf(retiredIds) : List.of();
        return new ImportReport(
                inserted, updated, retiredIds.size(), revived, shown, List.copyOf(rejected));
    }

    public int total() {
        return inserted + updated;
    }
}
