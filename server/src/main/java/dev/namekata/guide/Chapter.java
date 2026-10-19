package dev.namekata.guide;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * 장 하나. 화면에서는 가로로 넘기는 한 판이다.
 *
 * <p>{@code slug} 는 가이드 안에서만 유일하다. 세 언어 가이드에 전부
 * {@code class-names} 장이 있어도 주소가 겹치지 않는다
 * ({@code /guide/google-java-naming/class-names}).
 *
 * <p>{@code position} 에는 unique 를 걸지 않았다. 걸면 두 장의 순서를 맞바꿀 때
 * 임시값을 거쳐야 한다. 대신 읽을 때 {@code (position, id)} 로 정렬해서, 값이
 * 겹쳐도 순서가 흔들리지 않게 한다.
 */
@Entity
@Table(name = "chapters")
public class Chapter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String guideSlug;

    /** 주소에 쓰는 장 이름. {@code constant-names} */
    @Column(nullable = false)
    private String slug;

    /** 가이드 안에서의 순서. 10·20·30 으로 띄워 둔다. */
    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private String title;

    /**
     * 장 본문 마크다운.
     *
     * <p>안의 {@code ```java} 펜스는 웹이 {@code highlight.ts} 로 보낸다. 가이드
     * 본문의 예시 코드도 연습 문제와 같은 IntelliJ 배색으로 그려진다.
     */
    @Column(nullable = false)
    private String body;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Chapter() {
        // JPA 용
    }

    public Chapter(String guideSlug, String slug, int position, String title, String body) {
        this.guideSlug = guideSlug;
        this.slug = slug;
        this.position = position;
        this.title = title;
        this.body = body;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public void edit(String slug, int position, String title, String body) {
        this.slug = slug;
        this.position = position;
        this.title = title;
        this.body = body;
    }

    public Long id() {
        return id;
    }

    public String guideSlug() {
        return guideSlug;
    }

    public String slug() {
        return slug;
    }

    public int position() {
        return position;
    }

    public String title() {
        return title;
    }

    public String body() {
        return body;
    }
}
