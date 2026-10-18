package dev.namekata.guide;

import jakarta.persistence.Embeddable;

/**
 * 가이드의 출처.
 *
 * <p>번역을 싣는 이상 표기가 의무다. 구글 스타일가이드는 CC-BY 3.0 이라
 * 저작자 표시와 <strong>개작(번역) 사실 명시</strong>를 함께 요구하고,
 * 네이밍 치트시트는 MIT 다. 문제 코드에 이미 "식별자를 가려 수정함" 을 붙이고
 * 있으니 가이드에도 같은 규율을 적용한다.
 *
 * <p>세 칸 모두 null 을 허용한다. 번역이 아닌 자작 가이드를 쓸 수 있고, 그때
 * 출처가 없는 것은 범주가 아니라 값의 부재다. 화면은 {@code url} 이 있을 때만
 * 출처 블록을 그린다.
 */
@Embeddable
public class GuideSource {

    private String sourceTitle;

    private String sourceUrl;

    private String sourceLicense;

    protected GuideSource() {
        // JPA 용
    }

    public GuideSource(String title, String url, String license) {
        this.sourceTitle = title;
        this.sourceUrl = url;
        this.sourceLicense = license;
    }

    /** 표기할 것이 있는지. 없으면 화면이 출처 블록을 그리지 않는다. */
    public boolean isPresent() {
        return sourceUrl != null && !sourceUrl.isBlank();
    }

    public String title() {
        return sourceTitle;
    }

    public String url() {
        return sourceUrl;
    }

    public String license() {
        return sourceLicense;
    }
}
