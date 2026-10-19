package dev.namekata.guide;

import dev.namekata.guide.ChapterQuestion.Role;
import dev.namekata.naming.Masking;
import dev.namekata.question.Kind;
import dev.namekata.question.Language;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
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
    private final QuestionRepository questions;

    public GuideEditor(
            GuideRepository guides,
            ChapterRepository chapters,
            ChapterQuestionRepository links,
            QuestionNoteRepository notes,
            QuestionRepository questions) {
        this.guides = guides;
        this.chapters = chapters;
        this.links = links;
        this.notes = notes;
        this.questions = questions;
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

    /**
     * 연습 문제를 목록에서 한 칸 올리거나 내린다.
     *
     * <p>가이드 화면은 장과 문제를 한 목록으로 보여 준다. 그래서 "한 칸" 은 장을
     * 넘는 경우가 있고, <strong>장을 넘으면 그 장의 것이 된다.</strong>
     *
     * <pre>
     *   1 장A              1 장A
     *   2 장B      q2 ↓    2 장B
     *   ✎ q1       ────▶   ✎ q1
     *   ✎ q2               3 장C
     *   3 장C              ✎ q2     ← 장C 의 첫 문제가 됐다
     *   ✎ q3               ✎ q3
     * </pre>
     *
     * <p>같은 장 안에서는 이웃과 자리를 바꾼다. 장 순서를 다루는 방식
     * ({@link #moveChapter})과 같은 규칙이다 — 화면이 숫자를 계산하지 않는다.
     */
    @Transactional
    public void moveQuestion(long chapterId, String questionId, int offset) {
        Chapter owner = chapter(chapterId);
        List<Chapter> ordered = chapters.findByGuide(owner.guideSlug());

        // 장과 그 장의 연습 문제를 화면과 같은 순서로 늘어놓는다.
        List<Slot> flat = new ArrayList<>();
        for (Chapter each : ordered) {
            flat.add(new Slot(each, null));
            practiceOf(each).forEach(link -> flat.add(new Slot(each, link)));
        }

        int at = -1;
        for (int i = 0; i < flat.size(); i++) {
            Slot slot = flat.get(i);
            if (slot.link() != null
                    && slot.chapter().id() == chapterId
                    && slot.link().questionId().equals(questionId)) {
                at = i;
                break;
            }
        }
        int to = at + offset;
        if (at < 0 || to < 0 || to >= flat.size()) {
            return;
        }

        ChapterQuestion mine = flat.get(at).link();
        Slot target = flat.get(to);

        if (target.link() != null) {
            // 같은 장 안의 이웃과 자리를 바꾼다.
            int mineWas = mine.position();
            mine.moveTo(target.link().position());
            target.link().moveTo(mineWas);
            links.saveAll(List.of(mine, target.link()));
            return;
        }

        // 장을 넘는다. 내려가면 그 다음 장의 첫 문제가, 올라가면 앞 장의 마지막 문제가 된다.
        Chapter moved = offset > 0 ? target.chapter() : before(ordered, target.chapter());
        if (moved == null) {
            return;
        }
        List<ChapterQuestion> there = practiceOf(moved);
        int position =
                offset > 0
                        ? there.stream().mapToInt(ChapterQuestion::position).min().orElse(STEP) - STEP
                        : there.stream().mapToInt(ChapterQuestion::position).max().orElse(0) + STEP;

        links.delete(mine);
        links.flush();
        links.save(new ChapterQuestion(moved.id(), questionId, Role.PRACTICE, position));
    }

    /** 한 장의 연습 문제를 순서대로. */
    private List<ChapterQuestion> practiceOf(Chapter chapter) {
        return links.findByChapterIds(List.of(chapter.id())).stream()
                .filter(link -> link.role() == Role.PRACTICE)
                .sorted(Comparator.comparingInt(ChapterQuestion::position))
                .toList();
    }

    private static Chapter before(List<Chapter> ordered, Chapter chapter) {
        for (int i = 1; i < ordered.size(); i++) {
            if (ordered.get(i).id().equals(chapter.id())) {
                return ordered.get(i - 1);
            }
        }
        return null;
    }

    /** 화면이 보는 한 줄. 문제가 없으면 장 자체를 가리킨다. */
    private record Slot(Chapter chapter, ChapterQuestion link) {}

    @Transactional
    public void detach(long chapterId, String questionId, Role role) {
        links.deleteById(ChapterQuestion.keyOf(chapterId, questionId, role));
    }

    // ------------------------------------------------------------ 문제 만들기

    /**
     * 장을 쓰다가 그 자리에서 문제를 만든다.
     *
     * <p>113개 중에서 고르는 것만으로는 글 쓰는 흐름과 맞지 않는다 — 장을 쓰고,
     * 거기 필요한 문제를 만들고, 다음 장을 쓰는 식이어야 한다.
     *
     * <p>코드를 가리는 일과 답이 샜는지 보는 일을 여기서 한다. 추출기가 tree-sitter
     * 로 하던 것을 글자 단위로 하는데(Masking), 붙여넣은 코드는 잘린 조각이라 파싱이
     * 안 되는 경우가 많기 때문이다. 가린 뒤 {@link Masking#leak} 이 한 번 더 본다.
     *
     * @param chapterId 만들면서 바로 붙일 장. null 이면 만들기만 한다
     */
    @Transactional
    public Question writeQuestion(
            Long chapterId,
            Language language,
            Kind kind,
            String answer,
            String code,
            String owner,
            String docstring) {
        String name = answer == null ? "" : answer.trim();
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "답이 비어 있다");
        }
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "코드가 비어 있다");
        }

        String masked = Masking.hide(code, name);
        if (masked.equals(code)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "코드에서 '" + name + "' 을(를) 찾지 못했다");
        }
        Masking.leak(masked, name)
                .ifPresent(
                        found -> {
                            throw new ResponseStatusException(
                                    HttpStatus.BAD_REQUEST, "가린 뒤에도 답이 보인다: " + found);
                        });

        Question question =
                questions.save(
                        Question.authored(
                                nextId(name), language, kind, name, masked, Masking.PLACEHOLDER, owner,
                                docstring));

        if (chapterId != null) {
            attach(chapterId, question.id(), Role.PRACTICE);
        }
        return question;
    }

    /**
     * 자작 문제의 id.
     *
     * <p>추출된 문제는 저장소-커밋-줄번호라 출처가 id 에 드러난다. 자작 문제에는
     * 그럴 출처가 없으므로 답으로 짓는다. 같은 이름의 문제를 여러 개 만들 수
     * 있어야 해서 겹치면 번호를 붙인다.
     */
    private String nextId(String answer) {
        String base =
                "authored-"
                        + answer.toLowerCase(Locale.ROOT)
                                .replaceAll("[^a-z0-9]+", "-")
                                .replaceAll("^-|-$", "");
        String id = base;
        for (int n = 2; questions.existsById(id); n++) {
            id = base + "-" + n;
        }
        return id;
    }

    /** 자작 문제만 지운다. 추출된 문제는 import 가 주인이다. */
    @Transactional
    public void deleteQuestion(String questionId) {
        Question question =
                questions
                        .findById(questionId)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown question"));
        if (question.needsAttribution()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "추출된 문제는 여기서 지우지 않는다");
        }
        questions.delete(question);
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
