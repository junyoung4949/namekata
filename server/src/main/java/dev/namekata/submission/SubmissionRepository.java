package dev.namekata.submission;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 제출 기록.
 *
 * <p>읽는 쿼리가 없다. 전에는 한 문제에 들어온 답을 많이 나온 순으로 세는
 * {@code findAnswers} 가 있었는데, 다른 사람들의 답을 보여주지 않기로 하면서
 * 뺐다 (그 쿼리가 참조하던 {@code hidden_answers} 테이블도 함께 사라졌다).
 *
 * <p>그래도 쓰기는 계속한다 — 나중에 되살릴 수 없는 기록이다.
 */
public interface SubmissionRepository extends JpaRepository<Submission, Long> {}
