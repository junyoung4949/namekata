package dev.namekata.guide;

import dev.namekata.guide.ChapterQuestion.Role;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChapterQuestionRepository
        extends JpaRepository<ChapterQuestion, ChapterQuestion.Key> {

    /** 한 가이드의 모든 연결. 가이드 한 권을 통째로 읽을 때 한 번에 가져온다. */
    @Query("select cq from ChapterQuestion cq"
            + " where cq.key.chapterId in :chapterIds"
            + " order by cq.position, cq.key.questionId")
    List<ChapterQuestion> findByChapterIds(Collection<Long> chapterIds);

    /** 이 문제의 해설이 가리키는 장. 역방향 조회라 전용 인덱스가 있다. */
    @Query("select cq from ChapterQuestion cq"
            + " where cq.key.questionId = :questionId and cq.key.role = :role")
    List<ChapterQuestion> findByQuestion(String questionId, Role role);
}
