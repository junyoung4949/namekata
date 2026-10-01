package dev.namekata.submission;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    /**
     * 한 문제에 들어온 답을 많이 나온 순으로.
     *
     * <p>숨긴 답은 뺀다. 세는 일을 DB 에 맡기는 이유는 인기 있는 문제의 제출을
     * 전부 끌어오지 않으려는 것이다.
     *
     * <p>표기만 다른 답(getId / get_id)은 따로 센다. 어느 표기를 골랐는지도
     * 보여 줄 만한 정보라, 묶어 버리면 그게 사라진다.
     */
    @Query(
            value =
                    """
                    select s.name as name, count(*) as count
                      from submissions s
                     where s.question_id = :questionId
                       and not exists (
                           select 1 from hidden_answers h
                            where h.question_id = s.question_id and h.name = s.name)
                  group by s.name
                  order by count(*) desc, s.name asc
                     limit 200
                    """,
            nativeQuery = true)
    List<OtherAnswerRow> findAnswers(String questionId);

    /** 네이티브 쿼리 결과를 받는 창구. */
    interface OtherAnswerRow {
        String getName();

        long getCount();
    }
}
