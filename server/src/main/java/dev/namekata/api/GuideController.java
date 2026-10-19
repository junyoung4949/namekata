package dev.namekata.api;

import dev.namekata.guide.Chapter;
import dev.namekata.guide.ChapterQuestion;
import dev.namekata.guide.ChapterQuestion.Role;
import dev.namekata.guide.ChapterQuestionRepository;
import dev.namekata.guide.ChapterRepository;
import dev.namekata.guide.Guide;
import dev.namekata.guide.GuideRepository;
import dev.namekata.guide.GuideSource;
import dev.namekata.guide.QuestionNote;
import dev.namekata.guide.QuestionNoteRepository;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 가이드를 읽는 공개 API.
 *
 * <p>가이드 한 권을 <strong>한 번에</strong> 내려보낸다. 장을 넘길 때마다 요청을
 * 보내지 않으려는 것이다 — 가로로 넘기는 화면에서 그러면 넘길 때마다 기다리게
 * 된다. 한 권이 장 열 개 남짓이라 양도 감당할 만하다.
 *
 * <p>연습 문제는 정답을 빼고 내려간다. 채점은 {@code /submissions} 가 한다.
 */
@RestController
public class GuideController {

    private final GuideRepository guides;
    private final ChapterRepository chapters;
    private final ChapterQuestionRepository links;
    private final QuestionRepository questions;
    private final QuestionNoteRepository notes;

    public GuideController(
            GuideRepository guides,
            ChapterRepository chapters,
            ChapterQuestionRepository links,
            QuestionRepository questions,
            QuestionNoteRepository notes) {
        this.guides = guides;
        this.chapters = chapters;
        this.links = links;
        this.questions = questions;
        this.notes = notes;
    }

    /** 홈 목록. 장과 문제는 빼고 가이드만. */
    @GetMapping("/guides")
    @Transactional(readOnly = true)
    public List<GuideCard> list() {
        return guides.findPublished().stream().map(GuideController::toCard).toList();
    }

    /** 가이드 한 권 전부. 장 본문과 연습 문제가 들어 있다. */
    @GetMapping("/guides/{slug}")
    @Transactional(readOnly = true)
    public GuideView one(@PathVariable String slug) {
        Guide guide =
                guides
                        .findPublishedBySlug(slug)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown guide"));

        List<Chapter> found = chapters.findByGuide(slug);
        if (found.isEmpty()) {
            return new GuideView(toCard(guide), List.of());
        }

        List<ChapterQuestion> practice =
                links.findByChapterIds(found.stream().map(Chapter::id).toList()).stream()
                        .filter(link -> link.role() == Role.PRACTICE)
                        .toList();

        // 문제와 글을 한 번씩만 읽는다. 장마다 찾아 들어가면 N+1 이 된다.
        Map<String, Question> byId = new LinkedHashMap<>();
        for (Question question : questions.findAllById(practice.stream().map(ChapterQuestion::questionId).toList())) {
            byId.put(question.id(), question);
        }
        Map<String, QuestionNote> noteById = new LinkedHashMap<>();
        for (QuestionNote note : notes.findByQuestionIdIn(byId.keySet())) {
            noteById.put(note.questionId(), note);
        }

        List<ChapterView> views =
                found.stream()
                        .map(chapter -> toView(chapter, practice, byId, noteById))
                        .toList();
        return new GuideView(toCard(guide), views);
    }

    // ------------------------------------------------------------ 모양

    /**
     * 홈 목록에 쓰는 가이드 한 장.
     *
     * @param source 번역이 아닌 자작 가이드면 비어 있다. 화면은 있을 때만 출처를 그린다
     */
    public record GuideCard(
            String slug,
            String language,
            String title,
            String lede,
            SourceCredit source) {}

    public record SourceCredit(String title, String url, String license) {}

    public record GuideView(GuideCard guide, List<ChapterView> chapters) {}

    public record ChapterView(
            String slug, int position, String title, String body, List<PracticeView> practice) {}

    /**
     * 장에 붙은 연습 문제.
     *
     * @param brief 이 함수가 하는 일. 문제를 풀기 전부터 보여 준다
     * @param answerLength 빈칸을 글자 수만큼 그리기 위해 길이만 알려 준다
     */
    public record PracticeView(
            String id,
            String language,
            String kind,
            String maskedCode,
            String placeholder,
            String owner,
            String brief,
            int answerLength,
            SourceView source) {}

    // ------------------------------------------------------------ 옮기기

    private static GuideCard toCard(Guide guide) {
        GuideSource source = guide.source();
        return new GuideCard(
                guide.slug(),
                guide.language().code(),
                guide.title(),
                guide.lede(),
                source == null || !source.isPresent()
                        ? null
                        : new SourceCredit(source.title(), source.url(), source.license()));
    }

    private static ChapterView toView(
            Chapter chapter,
            List<ChapterQuestion> practice,
            Map<String, Question> byId,
            Map<String, QuestionNote> noteById) {
        List<PracticeView> attached =
                practice.stream()
                        .filter(link -> link.chapterId() == chapter.id())
                        .sorted(Comparator.comparingInt(ChapterQuestion::position))
                        .map(link -> byId.get(link.questionId()))
                        .filter(java.util.Objects::nonNull)
                        .map(question -> toPractice(question, noteById.get(question.id())))
                        .toList();
        return new ChapterView(
                chapter.slug(), chapter.position(), chapter.title(), chapter.body(), attached);
    }

    private static PracticeView toPractice(Question question, QuestionNote note) {
        return new PracticeView(
                question.id(),
                question.language().code(),
                question.kind().code(),
                question.maskedCode(),
                question.placeholder(),
                question.owner(),
                Optional.ofNullable(note).map(QuestionNote::brief).orElse(null),
                question.answer().length(),
                SourceView.of(question));
    }
}
