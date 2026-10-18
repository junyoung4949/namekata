package dev.namekata.api;

import dev.namekata.admin.AdminGuard;
import dev.namekata.guide.Chapter;
import dev.namekata.guide.ChapterQuestion;
import dev.namekata.guide.ChapterQuestion.Role;
import dev.namekata.guide.Guide;
import dev.namekata.guide.GuideEditor;
import dev.namekata.guide.GuideLanguage;
import dev.namekata.guide.GuideSource;
import dev.namekata.guide.QuestionNote;
import dev.namekata.question.Question;
import dev.namekata.question.QuestionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 가이드를 쓰는 화면이 쓰는 API.
 *
 * <p>공개 API({@link GuideController})와 보는 것이 다르다. 여기서는 초안까지 전부
 * 내려가고, 문제에는 <strong>정답이 들어 있다</strong> — 어느 문제를 어느 장에
 * 붙일지 고르려면 답을 봐야 한다.
 *
 * <p>모든 엔드포인트가 {@code x-admin-token} 을 받는다. 토큰이 설정돼 있지 않으면
 * 로컬에서만 열린다 ({@link AdminGuard}).
 */
@RestController
@RequestMapping("/admin")
public class GuideAdminController {

    private final AdminGuard guard;
    private final GuideEditor editor;
    private final QuestionRepository questions;

    public GuideAdminController(
            AdminGuard guard, GuideEditor editor, QuestionRepository questions) {
        this.guard = guard;
        this.editor = editor;
        this.questions = questions;
    }

    // ------------------------------------------------------------ 가이드

    @GetMapping("/guides")
    public List<GuideRow> guides(@RequestHeader(name = TOKEN, required = false) String token) {
        guard.check(token);
        return editor.allGuides().stream().map(GuideAdminController::toRow).toList();
    }

    @PostMapping("/guides")
    @ResponseStatus(HttpStatus.CREATED)
    public GuideRow create(
            @RequestHeader(name = TOKEN, required = false) String token,
            @RequestBody @Valid NewGuide request) {
        guard.check(token);
        return toRow(
                editor.createGuide(
                        request.slug(),
                        GuideLanguage.of(request.language()),
                        request.title(),
                        request.lede()));
    }

    @PostMapping("/guides/{slug}")
    public GuideRow edit(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable String slug,
            @RequestBody @Valid EditGuide request) {
        guard.check(token);
        return toRow(
                editor.editGuide(
                        slug,
                        GuideLanguage.of(request.language()),
                        request.title(),
                        request.lede(),
                        request.position()));
    }

    /** 원문 표기. 번역을 싣는 이상 라이선스가 요구하는 것이다. */
    @PostMapping("/guides/{slug}/source")
    public GuideRow credit(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable String slug,
            @RequestBody SourceRequest request) {
        guard.check(token);
        return toRow(editor.credit(slug, request.title(), request.url(), request.license()));
    }

    @PostMapping("/guides/{slug}/publish")
    public GuideRow publish(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable String slug,
            @RequestBody PublishRequest request) {
        guard.check(token);
        return toRow(editor.publish(slug, request.published()));
    }

    @DeleteMapping("/guides/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGuide(
            @RequestHeader(name = TOKEN, required = false) String token, @PathVariable String slug) {
        guard.check(token);
        editor.deleteGuide(slug);
    }

    // ------------------------------------------------------------ 장

    /** 장과 붙은 문제를 한 번에. 편집 화면이 가이드 한 권을 통째로 연다. */
    @GetMapping("/guides/{slug}/chapters")
    public List<ChapterRow> chapters(
            @RequestHeader(name = TOKEN, required = false) String token, @PathVariable String slug) {
        guard.check(token);

        List<ChapterQuestion> links = editor.linksOf(slug);
        Map<String, Question> byId =
                questions
                        .findAllById(links.stream().map(ChapterQuestion::questionId).toList())
                        .stream()
                        .collect(Collectors.toMap(Question::id, Function.identity()));

        return editor.chaptersOf(slug).stream()
                .map(
                        chapter ->
                                new ChapterRow(
                                        chapter.id(),
                                        chapter.slug(),
                                        chapter.position(),
                                        chapter.title(),
                                        chapter.body(),
                                        links.stream()
                                                .filter(link -> link.chapterId() == chapter.id())
                                                .map(link -> toAttached(link, byId.get(link.questionId())))
                                                .filter(java.util.Objects::nonNull)
                                                .toList()))
                .toList();
    }

    @PostMapping("/guides/{slug}/chapters")
    @ResponseStatus(HttpStatus.CREATED)
    public ChapterRow addChapter(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable String slug,
            @RequestBody @Valid NewChapter request) {
        guard.check(token);
        return bare(editor.addChapter(slug, request.slug(), request.title(), request.body()));
    }

    @PostMapping("/chapters/{id}")
    public ChapterRow editChapter(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable long id,
            @RequestBody @Valid EditChapter request) {
        guard.check(token);
        return bare(
                editor.editChapter(id, request.slug(), request.title(), request.body(), request.position()));
    }

    /** 한 칸 올리거나 내린다. 순서 숫자는 화면이 아니라 서버가 매긴다. */
    @PostMapping("/chapters/{id}/move")
    public List<ChapterRow> move(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable long id,
            @RequestBody MoveRequest request) {
        guard.check(token);
        return editor.moveChapter(id, request.offset()).stream()
                .map(GuideAdminController::bare)
                .toList();
    }

    @DeleteMapping("/chapters/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChapter(
            @RequestHeader(name = TOKEN, required = false) String token, @PathVariable long id) {
        guard.check(token);
        editor.deleteChapter(id);
    }

    // ------------------------------------------------------------ 문제

    /**
     * 붙일 문제를 고르는 목록. <strong>정답이 들어 있다.</strong>
     *
     * @param q 이름이나 저장소로 걸러 본다. 113개를 전부 훑기는 어렵다
     */
    @GetMapping("/questions")
    public List<QuestionRow> pick(
            @RequestHeader(name = TOKEN, required = false) String token,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String kind,
            @RequestParam(required = false) String q) {
        guard.check(token);
        String needle = q == null ? null : q.trim().toLowerCase();

        return questions.findAllLive().stream()
                .filter(found -> language == null || found.language().code().equals(language))
                .filter(found -> kind == null || found.kind().code().equals(kind))
                .filter(
                        found ->
                                needle == null
                                        || needle.isEmpty()
                                        || found.answer().toLowerCase().contains(needle)
                                        || found.id().toLowerCase().contains(needle))
                .map(
                        found ->
                                new QuestionRow(
                                        found.id(),
                                        found.language().code(),
                                        found.kind().code(),
                                        found.answer(),
                                        found.owner(),
                                        found.source().repo(),
                                        found.docstring(),
                                        found.maskedCode(),
                                        editor.note(found.id()).map(QuestionNote::isReady).orElse(false)))
                .toList();
    }

    @PostMapping("/chapters/{id}/questions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void attach(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable long id,
            @RequestBody @Valid AttachRequest request) {
        guard.check(token);
        editor.attach(id, request.questionId(), Role.of(request.role()));
    }

    @DeleteMapping("/chapters/{id}/questions/{questionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void detach(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable long id,
            @PathVariable String questionId,
            @RequestParam(defaultValue = "practice") String role) {
        guard.check(token);
        editor.detach(id, questionId, Role.of(role));
    }

    // ------------------------------------------------------------ 문제에 붙는 글

    @GetMapping("/questions/{id}/note")
    public NoteRow note(
            @RequestHeader(name = TOKEN, required = false) String token, @PathVariable String id) {
        guard.check(token);
        return editor
                .note(id)
                .map(note -> new NoteRow(note.questionId(), note.brief(), note.rationale()))
                .orElseGet(() -> new NoteRow(id, null, null));
    }

    @PostMapping("/questions/{id}/note")
    public NoteRow writeNote(
            @RequestHeader(name = TOKEN, required = false) String token,
            @PathVariable String id,
            @RequestBody NoteRequest request) {
        guard.check(token);
        QuestionNote note = editor.writeNote(id, request.brief(), request.rationale());
        return new NoteRow(note.questionId(), note.brief(), note.rationale());
    }

    // ------------------------------------------------------------ 모양

    private static final String TOKEN = "x-admin-token";

    public record GuideRow(
            String slug,
            String language,
            String title,
            String lede,
            int position,
            String status,
            String sourceTitle,
            String sourceUrl,
            String sourceLicense) {}

    public record ChapterRow(
            Long id, String slug, int position, String title, String body, List<Attached> questions) {}

    /**
     * 장에 붙은 문제. 편집 화면이 보는 모양이라 정답이 들어 있다.
     *
     * @param ready 상황 설명(brief)을 썼는지. 안 썼으면 연습 칸이 빈 채로 나온다
     */
    public record Attached(
            String questionId, String role, int position, String answer, String owner, boolean ready) {}

    public record QuestionRow(
            String id,
            String language,
            String kind,
            String answer,
            String owner,
            String repo,
            String docstring,
            String maskedCode,
            boolean ready) {}

    public record NoteRow(String questionId, String brief, String rationale) {}

    public record NewGuide(
            @NotBlank String slug, @NotBlank String language, @NotBlank String title, String lede) {}

    public record EditGuide(
            @NotBlank String language, @NotBlank String title, String lede, Integer position) {}

    public record SourceRequest(String title, String url, String license) {}

    public record PublishRequest(boolean published) {}

    public record NewChapter(@NotBlank String slug, @NotBlank String title, String body) {}

    public record EditChapter(
            @NotBlank String slug, @NotBlank String title, String body, Integer position) {}

    public record MoveRequest(int offset) {}

    public record AttachRequest(@NotBlank String questionId, @NotBlank String role) {}

    public record NoteRequest(String brief, String rationale) {}

    private static GuideRow toRow(Guide guide) {
        GuideSource source = guide.source();
        return new GuideRow(
                guide.slug(),
                guide.language().code(),
                guide.title(),
                guide.lede(),
                guide.position(),
                guide.status().code(),
                source == null ? null : source.title(),
                source == null ? null : source.url(),
                source == null ? null : source.license());
    }

    private static ChapterRow bare(Chapter chapter) {
        return new ChapterRow(
                chapter.id(), chapter.slug(), chapter.position(), chapter.title(), chapter.body(), List.of());
    }

    private Attached toAttached(ChapterQuestion link, Question question) {
        if (question == null) {
            return null;
        }
        return new Attached(
                question.id(),
                link.role().code(),
                link.position(),
                question.answer(),
                question.owner(),
                editor.note(question.id()).map(QuestionNote::isReady).orElse(false));
    }
}
