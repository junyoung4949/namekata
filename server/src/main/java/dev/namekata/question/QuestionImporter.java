package dev.namekata.question;

import static java.util.stream.Collectors.toSet;

import dev.namekata.naming.AnswerLeak;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 추출기가 보낸 문제를 DB에 반영한다.
 *
 * <p>규칙 넷이 전부다.
 *
 * <ol>
 *   <li><b>추출기 칸만 갱신한다.</b> 검수 상태와 사람이 채운 저작권자는 건드리지
 *       않는다. 그래서 on conflict 의 set 목록에 그 칸이 없다
 *   <li><b>사라진 문제는 지우지 않고 내린다.</b> 제출·신고 기록이 그 id 를 가리키고
 *       있어서, 지우면 그 기록이 어느 문제 것인지 알 수 없게 된다
 *   <li><b>다시 올라온 문제는 되살린다.</b> 필터를 되돌렸을 때 전에 쌓인 제출이
 *       그대로 이어진다
 *   <li><b>답이 보이는 문제는 받지 않는다.</b> 추출기의 가리기를 믿지 않고 여기서
 *       한 번 더 확인한다 ({@link dev.namekata.naming.AnswerLeak})
 * </ol>
 *
 * <p>JPA 대신 SQL 을 쓴다. 규칙 1이 "이 칸들만 갱신"인데, 엔티티를 불러와 고치는
 * 방식으로는 그걸 코드 한 곳에서 보장할 수 없다 — setter 를 하나 더 만드는 순간
 * 새어 나간다. 여기서는 set 목록이 곧 명세다.
 */
@Service
public class QuestionImporter {

    /** 한 행에 넣는 모든 값. 아래 PARAMS 의 순서와 반드시 같아야 한다. */
    private static final String UPSERT =
            """
            insert into questions (
                id, language, kind, answer, masked_code, placeholder, owner, docstring,
                level, review_flags,
                repo, commit_hash, file_path, start_line, end_line, license, copyright_holder,
                created_at, updated_at
            ) values (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                now(), now()
            )
            on conflict (id) do update set
                language         = excluded.language,
                kind             = excluded.kind,
                answer           = excluded.answer,
                masked_code      = excluded.masked_code,
                placeholder      = excluded.placeholder,
                owner            = excluded.owner,
                docstring        = excluded.docstring,
                level            = excluded.level,
                review_flags     = excluded.review_flags,
                repo             = excluded.repo,
                commit_hash      = excluded.commit_hash,
                file_path        = excluded.file_path,
                start_line       = excluded.start_line,
                end_line         = excluded.end_line,
                license          = excluded.license,
                copyright_holder = excluded.copyright_holder,
                -- 다시 올라왔으니 되살린다.
                retired_at       = null,
                updated_at       = now()
            -- 여기에 status 와 copyright_holder_override 가 없는 것이 이 클래스의 핵심이다.
            -- 사람이 검수 화면에서 한 일을 추출기가 덮어쓰지 않는다.
            """;

    private final JdbcClient jdbc;
    private final JdbcTemplate jdbcTemplate;

    public QuestionImporter(JdbcClient jdbc, JdbcTemplate jdbcTemplate) {
        this.jdbc = jdbc;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public ImportReport importAll(List<QuestionPayload> payloads) {
        if (payloads.isEmpty()) {
            return ImportReport.of(0, 0, 0, List.of(), List.of());
        }

        // 보낸 문제 전부의 id. 답이 보여서 거부한 것도 여기 남는다 — 빼면 아래
        // retireMissing 이 "안 보내졌다"고 보고 이미 있던 멀쩡한 판을 내려 버린다.
        // 받지 않은 것과 내려간 것은 다른 일이다.
        List<String> ids = payloads.stream().map(QuestionPayload::id).toList();
        Set<String> repos = new LinkedHashSet<>(payloads.stream().map(p -> p.source().repo()).toList());

        List<ImportReport.Rejected> rejected = findLeaks(payloads);
        Set<String> rejectedIds = rejected.stream().map(ImportReport.Rejected::id).collect(toSet());
        List<QuestionPayload> accepted =
                payloads.stream().filter(p -> !rejectedIds.contains(p.id())).toList();

        if (accepted.isEmpty()) {
            // 넣을 게 없으면 내리지도 않는다. 전부 거부된 것은 추출기가 고장난
            // 상황이고, 그걸 근거로 DB 를 줄이면 안 된다.
            return ImportReport.of(0, 0, 0, List.of(), rejected);
        }

        List<String> acceptedIds = accepted.stream().map(QuestionPayload::id).toList();

        // 넣기 전에 세어 둔다. upsert 가 끝나면 전부 "있는" 상태가 되어 구별할 수 없다.
        int updated = findExisting(acceptedIds).size();
        int revived = countRetired(acceptedIds);

        upsert(accepted);
        List<String> retiredIds = retireMissing(repos, ids);

        return ImportReport.of(
                acceptedIds.size() - updated, updated, revived, retiredIds, rejected);
    }

    /**
     * 답이 코드에 그대로 보이는 문제를 골라낸다.
     *
     * <p>추출기가 이미 같은 검사를 하지만, 그쪽 단어 쪼개기가 틀리면 만들어야 할
     * 변형을 못 만들어 누출을 놓친다. 그 경우 지금은 검수자가 눈으로 잡아야 하는데,
     * 문제 수백 개에 그걸 기대할 수 없다. 서로 다른 구현으로 같은 성질을 확인한다.
     */
    private List<ImportReport.Rejected> findLeaks(List<QuestionPayload> payloads) {
        return payloads.stream()
                .flatMap(
                        payload ->
                                AnswerLeak.find(payload.maskedCode(), payload.answer())
                                        .map(
                                                visible ->
                                                        new ImportReport.Rejected(
                                                                payload.id(),
                                                                "답이 코드에 보인다: '%s' (정답 '%s')"
                                                                        .formatted(visible, payload.answer())))
                                        .stream())
                .toList();
    }

    private Set<String> findExisting(List<String> ids) {
        return Set.copyOf(
                jdbc.sql("select id from questions where id in (:ids)")
                        .param("ids", ids)
                        .query(String.class)
                        .list());
    }

    private int countRetired(List<String> ids) {
        return jdbc.sql("select count(*) from questions where id in (:ids) and retired_at is not null")
                .param("ids", ids)
                .query(Integer.class)
                .single();
    }

    /**
     * 한 번에 밀어 넣는다.
     *
     * <p>행마다 따로 보내면 원격 DB 와는 왕복이 문제 수만큼 생긴다. 문제 1000개에
     * 왕복 35ms 면 35초다. 그리고 {@code review_flags} 가 {@code text[]} 라서
     * {@link java.sql.Connection#createArrayOf} 가 필요한데, 배치 설정자 안에서는
     * 연결을 바로 쓸 수 있다.
     */
    private void upsert(List<QuestionPayload> payloads) {
        jdbcTemplate.batchUpdate(
                UPSERT,
                new BatchPreparedStatementSetter() {

                    @Override
                    public void setValues(PreparedStatement ps, int i) throws SQLException {
                        QuestionPayload payload = payloads.get(i);
                        QuestionPayload.Source source = payload.source();
                        int at = 0;
                        ps.setString(++at, payload.id());
                        ps.setString(++at, payload.language().code());
                        ps.setString(++at, payload.kind().code());
                        ps.setString(++at, payload.answer());
                        ps.setString(++at, payload.maskedCode());
                        ps.setString(++at, payload.placeholder());
                        ps.setString(++at, payload.owner());
                        ps.setString(++at, payload.docstring());
                        ps.setShort(++at, payload.level());
                        ps.setArray(
                                ++at,
                                ps.getConnection()
                                        .createArrayOf("text", payload.reviewFlagsOrEmpty().toArray()));
                        ps.setString(++at, source.repo());
                        ps.setString(++at, source.commitHash());
                        ps.setString(++at, source.filePath());
                        ps.setInt(++at, source.startLine());
                        ps.setInt(++at, source.endLine());
                        ps.setString(++at, source.license());
                        ps.setString(++at, source.copyrightHolder());
                    }

                    @Override
                    public int getBatchSize() {
                        return payloads.size();
                    }
                });
    }

    /**
     * 이번 추출 결과에 없는 문제를 내린다.
     *
     * <p>보낸 저장소 안에서만 따진다. 추출기를 소스 목록 일부로 돌릴 수도 있는데
     * (한 저장소만 추가해 보는 경우), 전체를 기준으로 재면 나머지 저장소의 문제가
     * 통째로 내려간다.
     *
     * <p>그래서 {@code sources.json} 에서 저장소를 아예 빼면 그 저장소의 문제는
     * 내려가지 않고 남는다. 아무도 "없어졌다"고 말해 주지 않았으니 그대로 두는
     * 편이 맞다 — 내리는 것은 검수 화면에서 사람이 한다.
     */
    private List<String> retireMissing(Set<String> repos, List<String> ids) {
        return jdbc.sql(
                        """
                        update questions
                           set retired_at = now(), updated_at = now()
                         where retired_at is null
                           and repo in (:repos)
                           and id not in (:ids)
                        returning id
                        """)
                .param("repos", repos)
                .param("ids", ids)
                .query(String.class)
                .list();
    }
}
