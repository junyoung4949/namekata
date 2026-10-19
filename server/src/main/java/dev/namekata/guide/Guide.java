package dev.namekata.guide;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * 가이드 한 권. 네이밍 방법론 문서 하나에 해당한다.
 *
 * <p>문제와 달리 추출기가 손대지 않는다. 사람이 쓰고 사람이 고치는 글이라
 * 칸의 주인이 하나뿐이고, 그래서 {@code questions} 처럼 주인별로 칸을 가를
 * 필요가 없다.
 *
 * <p>장은 양방향 연관으로 걸지 않는다. 한 권에 장이 열 개 남짓이지만, 목록
 * 화면은 장을 아예 읽지 않고 가이드만 읽는다. 연관을 걸어 두면 그 화면에서도
 * 장을 끌고 올지 말지를 매번 신경 써야 한다.
 */
@Entity
@Table(name = "guides")
public class Guide {

    /** 주소에 쓰는 이름. {@code google-java-naming} */
    @Id
    private String slug;

    @Column(nullable = false)
    private GuideLanguage language = GuideLanguage.COMMON;

    @Column(nullable = false)
    private String title;

    /** 홈 카드의 한 줄 소개. */
    private String lede;

    /** 홈 목록에서의 순서. 10·20·30 으로 띄워 둔다. */
    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private GuideStatus status = GuideStatus.DRAFT;

    @Embedded
    private GuideSource source;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Guide() {
        // JPA 용
    }

    public Guide(String slug, GuideLanguage language, String title, String lede, int position) {
        this.slug = slug;
        this.language = language;
        this.title = title;
        this.lede = lede;
        this.position = position;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public void edit(GuideLanguage language, String title, String lede, int position) {
        this.language = language;
        this.title = title;
        this.lede = lede;
        this.position = position;
    }

    public void publish() {
        this.status = GuideStatus.PUBLISHED;
    }

    public void unpublish() {
        this.status = GuideStatus.DRAFT;
    }

    public void credit(GuideSource source) {
        this.source = source;
    }

    public boolean isPublished() {
        return status == GuideStatus.PUBLISHED;
    }

    public String slug() {
        return slug;
    }

    public GuideLanguage language() {
        return language;
    }

    public String title() {
        return title;
    }

    public String lede() {
        return lede;
    }

    public int position() {
        return position;
    }

    public GuideStatus status() {
        return status;
    }

    public GuideSource source() {
        return source;
    }
}
