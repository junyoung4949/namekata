package dev.namekata.question;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * 문제 조회.
 *
 * <p>쓰기는 검수(status, copyright override)뿐이다. 추출기 칸을 바꾸는 일은
 * {@link QuestionImporter} 가 SQL 로 한다.
 */
public interface QuestionRepository extends JpaRepository<Question, String> {

    /** 내려간 문제는 빼고. 목록·풀이 화면이 쓴다. */
    @Query("select q from Question q where q.retiredAt is null")
    List<Question> findAllLive();

    @Query("select q from Question q where q.retiredAt is null and q.id = :id")
    Optional<Question> findLiveById(String id);

    /** 검수 화면용. 내려간 것까지 전부. */
    @Query("select q from Question q order by q.status, q.id")
    List<Question> findAllForReview();

    /**
     * 사람이 봐야 할 표시가 붙은 문제. 검수 화면이 먼저 보여준다.
     *
     * <p>네이티브 쿼리를 쓴다. {@code review_flags} 는 연관관계가 아니라 {@code text[]}
     * 한 칸이라, HQL 에서는 길이를 물어볼 방법이 없다.
     */
    @Query(
            value = "select * from questions where retired_at is null and cardinality(review_flags) > 0",
            nativeQuery = true)
    List<Question> findFlagged();
}
