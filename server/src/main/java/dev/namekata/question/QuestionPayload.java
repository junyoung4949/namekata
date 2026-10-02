package dev.namekata.question;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 추출기가 보내는 문제 하나.
 *
 * <p>{@code data/questions.json} 의 한 원소와 모양이 같다. 필드 이름이 snake_case
 * 라서 {@link JsonProperty} 로 하나씩 적어 둔다 — Jackson 설정을 전역으로 바꾸면
 * 웹에 내려보내는 응답(camelCase)까지 같이 바뀐다.
 *
 * <p>여기 없는 것들:
 *
 * <ul>
 *   <li>{@code source.repo_url}, {@code source.url} — 다른 칸에서 계산된다. 받아서
 *       저장하면 두 벌이 되고 어긋난다
 *   <li>{@code answer_words} — 추출기가 보내지 않는다. {@code answer} 를 받아
 *       {@link dev.namekata.naming.Identifier} 가 쪼갠다. 채점은 정답과 제출을 같은
 *       자로 재야 하는데 제출은 실행 중에 들어오므로, 쪼개는 일은 여기여야 한다
 *   <li>{@code status} — 사람이 정한다. 추출기는 전부 pending 으로 내보내지만, 이미
 *       검수를 마친 문제를 다시 pending 으로 되돌릴 수는 없다
 * </ul>
 */
public record QuestionPayload(
        @NotBlank String id,
        @NotNull Language language,
        @NotNull Kind kind,
        @NotBlank String answer,
        @JsonProperty("masked_code") @NotBlank String maskedCode,
        @NotBlank String placeholder,
        String owner,
        String docstring,
        @Min(0) @Max(5) short level,
        @JsonProperty("review_flags") List<String> reviewFlags,
        @Valid @NotNull Source source) {

    /** 출처. {@code questions.json} 의 {@code source} 와 같은 모양이다. */
    public record Source(
            @NotBlank String repo,
            @JsonProperty("commit_hash") @NotBlank String commitHash,
            @JsonProperty("file_path") @NotBlank String filePath,
            @JsonProperty("start_line") @Min(1) int startLine,
            @JsonProperty("end_line") @Min(1) int endLine,
            @NotBlank String license,
            @JsonProperty("copyright_holder") String copyrightHolder) {}

    public List<String> reviewFlagsOrEmpty() {
        return reviewFlags == null ? List.of() : reviewFlags;
    }
}
