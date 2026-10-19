package dev.namekata.guide;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionNoteRepository extends JpaRepository<QuestionNote, String> {

    List<QuestionNote> findByQuestionIdIn(Collection<String> questionIds);
}
