package dev.namekata.submission;

import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionStatsRepository extends JpaRepository<QuestionStatsRow, String> {}
