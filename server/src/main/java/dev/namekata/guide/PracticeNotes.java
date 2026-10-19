package dev.namekata.guide;

import dev.namekata.guide.ChapterQuestion.Role;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 문제를 푼 뒤에 보여줄 것 — 해설과 관련 장.
 *
 * <p>풀기 전에 보여주는 {@code brief} 와 짝이지만 내려가는 시점이 다르다.
 * brief 는 문제와 함께 가고(가이드 한 권을 읽을 때), 해설은 제출한 뒤에 간다.
 * 해설이 답 단어를 그대로 설명하는 글이라 미리 내려보내면 답이 새기 때문이다.
 */
@Service
public class PracticeNotes {

    private final QuestionNoteRepository notes;
    private final ChapterQuestionRepository links;
    private final ChapterRepository chapters;

    public PracticeNotes(
            QuestionNoteRepository notes,
            ChapterQuestionRepository links,
            ChapterRepository chapters) {
        this.notes = notes;
        this.links = links;
        this.chapters = chapters;
    }

    @Transactional(readOnly = true)
    public Explanation of(String questionId) {
        String rationale =
                notes.findById(questionId).map(QuestionNote::rationale).orElse(null);

        List<ChapterRef> refs =
                links.findByQuestion(questionId, Role.REFERENCE).stream()
                        .map(link -> chapters.findById(link.chapterId()))
                        .flatMap(Optional::stream)
                        .map(ChapterRef::of)
                        .toList();

        return new Explanation(rationale, refs);
    }

    /**
     * @param rationale 원저자가 어떤 원칙으로 이 이름을 지었는지. 아직 안 썼으면 null
     * @param references 해설이 가리키는 장. 화면이 칩으로 늘어놓는다
     */
    public record Explanation(String rationale, List<ChapterRef> references) {}

    /** 장으로 가는 길. 주소를 조합할 재료만 담는다. */
    public record ChapterRef(String guideSlug, String chapterSlug, String title) {

        static ChapterRef of(Chapter chapter) {
            return new ChapterRef(chapter.guideSlug(), chapter.slug(), chapter.title());
        }
    }
}
