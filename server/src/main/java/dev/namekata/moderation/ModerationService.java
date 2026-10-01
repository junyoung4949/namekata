package dev.namekata.moderation;

import dev.namekata.naming.Identifier;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 신고 접수와 답 숨기기. */
@Service
public class ModerationService {

    /** 검수 화면이 한 번에 보는 신고 수. */
    private static final int RECENT_REPORTS = 200;

    private final ReportRepository reports;
    private final HiddenAnswerRepository hidden;

    public ModerationService(ReportRepository reports, HiddenAnswerRepository hidden) {
        this.reports = reports;
        this.hidden = hidden;
    }

    @Transactional
    public void report(String questionId, String rawName) {
        reports.save(new Report(questionId, validName(rawName)));
    }

    @Transactional(readOnly = true)
    public List<Report> recentReports() {
        return reports
                .findAll(PageRequest.of(0, RECENT_REPORTS, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();
    }

    /** 같은 답을 두 번 숨겨도 탈 없이 지나간다 (검수 화면에서 두 번 누를 수 있다). */
    @Transactional
    public void hide(String questionId, String rawName) {
        String name = validName(rawName);
        HiddenAnswer.Key key = new HiddenAnswer.Key(questionId, name);
        if (!hidden.existsById(key)) {
            hidden.save(new HiddenAnswer(questionId, name));
        }
    }

    private String validName(String rawName) {
        return Identifier.parse(rawName)
                .map(Identifier::text)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid name"));
    }
}
