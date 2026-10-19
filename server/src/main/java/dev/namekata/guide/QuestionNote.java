package dev.namekata.guide;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * 문제에 붙는 사람의 글. 문제 하나당 한 행이다.
 *
 * <p>{@code questions} 의 칸으로 넣지 않은 이유는 주인이 다르기 때문이다.
 * 추출기는 {@code questions} 를 매번 덮어쓰고, 사람은 여기만 쓴다. 한 행을
 * 둘이 나눠 가지면 import 가 사람의 글을 지운다 — 베이스라인에 적어 둔
 * "칸마다 주인을 하나로" 가 테이블 단위로 올라온 셈이다.
 */
@Entity
@Table(name = "question_notes")
public class QuestionNote {

    @Id
    private String questionId;

    /**
     * 이 함수가 하는 일.
     *
     * <p>코드 독해 부담을 덜어 네이밍에만 집중시킨다. 숨겨 두고 감점을 매기는
     * 힌트가 아니라, 연습 화면 왼쪽 칸에 처음부터 보이는 전제다.
     *
     * <p>설명을 충실히 쓰면 답 단어가 얼마간 새어 나간다 ("앞쪽에 채워" 가
     * padStart 를 가리키는 식으로). 그래도 그대로 둔다 — 연습의 성격이
     * "이 코드가 뭘 하는지 맞히기" 가 아니라 "뜻을 다 아는 상태에서 어느
     * 단어를 고를지" 이기 때문이다.
     *
     * <p>비어 있으면 그 문제는 가이드에 붙이지 않는다. 별도의 상태 칸을 두지
     * 않고 이 값의 유무로 판정한다.
     */
    private String brief;

    /**
     * 해설. 원저자는 어떤 원칙으로 이 이름을 지었는가.
     *
     * <p>제출한 뒤에 보인다. 마크다운이라 장 링크를 문장 안에 넣을 수 있다
     * ({@code [상수 이름](/guide/google-java-naming/constant-names)}).
     */
    private String rationale;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected QuestionNote() {
        // JPA 용
    }

    public QuestionNote(String questionId, String brief, String rationale) {
        this.questionId = questionId;
        this.brief = brief;
        this.rationale = rationale;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public void edit(String brief, String rationale) {
        this.brief = brief;
        this.rationale = rationale;
    }

    /** 가이드에 붙일 수 있는 문제인지. */
    public boolean isReady() {
        return brief != null && !brief.isBlank();
    }

    public String questionId() {
        return questionId;
    }

    public String brief() {
        return brief;
    }

    public String rationale() {
        return rationale;
    }
}
