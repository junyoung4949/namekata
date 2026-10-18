package dev.namekata.guide;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GuideRepository extends JpaRepository<Guide, String> {

    /** 홈 목록. 공개된 것만, 정해 둔 순서로. */
    @Query("select g from Guide g where g.status = dev.namekata.guide.GuideStatus.PUBLISHED"
            + " order by g.position, g.slug")
    List<Guide> findPublished();

    @Query("select g from Guide g where g.slug = :slug"
            + " and g.status = dev.namekata.guide.GuideStatus.PUBLISHED")
    Optional<Guide> findPublishedBySlug(String slug);

    /** 검수·편집 화면용. 초안까지 전부. */
    @Query("select g from Guide g order by g.position, g.slug")
    List<Guide> findAllOrdered();
}
