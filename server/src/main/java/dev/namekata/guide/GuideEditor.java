package dev.namekata.guide;

import dev.namekata.guide.ChapterQuestion.Role;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 가이드를 쓰고 고친다.
 *
 * <p>본문의 주인이 DB 라는 결정이 여기서 값을 한다. 글을 고칠 때마다 커밋하고
 * 배포하는 대신 이 창구로 바로 쓴다. 대신 git diff 와 이력이 없으므로, 되돌릴
 * 일이 잦아지면 개정 이력 테이블을 따로 둬야 한다.
 *
 * <p>순서(position)는 10 씩 띄워 매긴다. 사이에 끼워 넣을 때 뒤를 전부 밀지
 * 않아도 되고, 값이 겹쳐도 읽을 때 (position, id) 로 정렬하므로 흔들리지 않는다.
 */
@Service
public class GuideEditor {

    /** 새 항목을 끝에 붙일 때 벌려 두는 간격. */
    private static final int STEP = 10;

    private final GuideRepository guides;
    private final ChapterRepository chapters;
    private final ChapterQuestionRepository links;
    private final QuestionNoteRepository notes;

    public GuideEditor(
            GuideRepository guides,
            ChapterRepository chapters,
            ChapterQuestionRepository links,
            QuestionNoteRepository notes) {
        this.guides = guides;
        this.chapters = chapters;
        this.links = links;
        this.notes = notes;
    }

    // ------------------------------------------------------------ 가이드

    @Transactional(readOnly = true)
    public List<Guide> allGuides() {
        return guides.findAllOrdered();
    }

    @Transactional
    public Guide createGuide(String slug, GuideLanguage language, String title, String lede) {
        if (guides.existsById(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "slug already taken");
        }
        int position = guides.findAll().stream().mapToInt(Guide::position).max().orElse(0) + STEP;
        return guides.save(new Guide(slug, language, title, lede, position));
    }

    @Transactional
    public Guide editGuide(
            String slug, GuideLanguage language, String title, String lede, Integer position) {
        Guide guide = guide(slug);
        guide.edit(language, title, lede, position == null ? guide.position() : position);
        return guides.save(guide);
    }

    @Transactional
    public Guide credit(String slug, String sourceTitle, String sourceUrl, String sourceLicense) {
        Guide guide = guide(slug);
        guide.credit(new GuideSource(sourceTitle, sourceUrl, sourceLicense));
        return guides.save(guide);
    }

    @Transactional
    public Guide publish(String slug, boolean published) {
        Guide guide = guide(slug);
        if (published) {
            guide.publish();
        } else {
            guide.unpublish();
        }
        return guides.save(guide);
    }

    @Transactional
    public void deleteGuide(String slug) {
        guides.delete(guide(slug));
    }

    // ------------------------------------------------------------ 장

    @Transactional(readOnly = true)
    public List<Chapter> chaptersOf(String guideSlug) {
        guide(guideSlug); // 없는 가이드면 여기서 404
        return chapters.findByGuide(guideSlug);
    }

    @Transactional
    public Chapter addChapter(String guideSlug, String slug, String title, String body) {
        guide(guideSlug);
        if (chapters.findByGuideSlugAndSlug(guideSlug, slug).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "slug already taken in guide");
        }
        int position =
                chapters.findByGuide(guideSlug).stream().mapToInt(Chapter::position).max().orElse(0)
                        + STEP;
        return chapters.save(new Chapter(guideSlug, slug, position, title, body));
    }

    @Transactional
    public Chapter editChapter(long id, String slug, String title, String body, Integer position) {
        Chapter chapter = chapter(id);
        chapters
                .findByGuideSlugAndSlug(chapter.guideSlug(), slug)
                .filter(other -> !other.id().equals(id))
                .ifPresent(
                        other -> {
                            throw new ResponseStatusException(
                                    HttpStatus.CONFLICT, "slug already taken in guide");
                        });
        chapter.edit(slug, position == null ? chapter.position() : position, title, body);
        return chapters.save(chapter);
    }

    @Transactional
    public void deleteChapter(long id) {
        chapters.delete(chapter(id));
    }

    /**
     * 장을 한 칸 올리거나 내린다.
     *
     * <p>position 을 직접 받지 않고 이웃과 맞바꾼다. 화면이 숫자를 계산하게 하면
     * 두 사람이 동시에 고칠 때 순서가 뒤엉킨다. 여기서는 "옆 것과 자리를
     * 바꾼다" 한 가지만 한다.
     */
    @Transactional
    public List<Chapter> moveChapter(long id, int offset) {
        Chapter target = chapter(id);
        List<Chapter> ordered = chapters.findByGuide(target.guideSlug());

        int at = -1;
        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).id().equals(id)) {
                at = i;
                break;
            }
        }
        int to = at + offset;
        if (at < 0 || to < 0 || to >= ordered.size()) {
            return ordered;
        }

        Chapter neighbour = ordered.get(to);
        int mine = target.position();
        target.edit(target.slug(), neighbour.position(), target.title(), target.body());
        neighbour.edit(neighbour.slug(), mine, neighbour.title(), neighbour.body());
        chapters.saveAll(List.of(target, neighbour));

        return chapters.findByGuide(target.guideSlug());
    }

    // ------------------------------------------------------------ 문제 연결

    @Transactional(readOnly = true)
    public List<ChapterQuestion> linksOf(String guideSlug) {
        List<Long> ids = chaptersOf(guideSlug).stream().map(Chapter::id).toList();
        return ids.isEmpty() ? List.of() : links.findByChapterIds(ids);
    }

    /**
     * 장에 문제를 붙인다.
     *
     * <p>붙이는 행위가 곧 승인이다. 따로 검수 단계를 두지 않는 이유가 이것이다 —
     * 저자가 이 장에 쓸 만하다고 판단해 고른 것이므로, 같은 판단을 한 번 더
     * 할 이유가 없다.
     */
    @Transactional
    public void attach(long chapterId, String questionId, Role role) {
        Chapter chapter = chapter(chapterId);
        int position =
                role == Role.PRACTICE
                        ? links.findByChapterIds(List.of(chapter.id())).stream()
                                        .filter(link -> link.role() == Role.PRACTICE)
                                        .mapToInt(ChapterQuestion::position)
                                        .max()
                                        .orElse(0)
                                + STEP
                        : 0;
        links.save(new ChapterQuestion(chapter.id(), questionId, role, position));
    }

    @Transactional
    public void detach(long chapterId, String questionId, Role role) {
        links.deleteById(ChapterQuestion.keyOf(chapterId, questionId, role));
    }

    // ------------------------------------------------------------ 문제에 붙는 글

    @Transactional(readOnly = true)
    public Optional<QuestionNote> note(String questionId) {
        return notes.findById(questionId);
    }

    @Transactional
    public QuestionNote writeNote(String questionId, String brief, String rationale) {
        QuestionNote note =
                notes.findById(questionId)
                        .map(
                                found -> {
                                    found.edit(brief, rationale);
                                    return found;
                                })
                        .orElseGet(() -> new QuestionNote(questionId, brief, rationale));
        return notes.save(note);
    }

    // ------------------------------------------------------------ 공통

    private Guide guide(String slug) {
        return guides
                .findById(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown guide"));
    }

    private Chapter chapter(long id) {
        return chapters
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown chapter"));
    }
}
