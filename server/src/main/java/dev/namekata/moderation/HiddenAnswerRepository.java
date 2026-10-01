package dev.namekata.moderation;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HiddenAnswerRepository extends JpaRepository<HiddenAnswer, HiddenAnswer.Key> {}
