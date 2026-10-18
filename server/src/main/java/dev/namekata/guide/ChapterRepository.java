package dev.namekata.guide;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    /**
     * 한 가이드의 장을 순서대로.
     *
     * <p>position 뒤에 id 를 붙여 정렬한다. position 에 unique 를 걸지 않았으므로
     * (순서를 맞바꿀 때 임시값을 거치지 않으려고) 값이 겹칠 수 있는데, 그때도
     * 순서가 흔들리지 않아야 한다.
     */
    @Query("select c from Chapter c where c.guideSlug = :guideSlug order by c.position, c.id")
    List<Chapter> findByGuide(String guideSlug);

    Optional<Chapter> findByGuideSlugAndSlug(String guideSlug, String slug);
}
