-- 남의 답을 보여주는 기능을 걷어낸다.
--
-- 셋 다 "다른 사람들의 답" 하나에 딸려 있던 것이다. 답을 보여주지 않으면
-- 신고할 대상이 없고, 숨길 것도 없다. 집계 뷰는 목록 화면의 겹침률과 실측
-- 등급에만 쓰였는데 가이드 중심으로 바뀌면서 둘 다 사라졌다.
--
-- submissions 원본은 남긴다. 읽는 길은 없어지지만 나중에 되살릴 수 없는
-- 기록이라 계속 쌓는다 — 설계 문서의 검증 계획("푼 사람 수, 끝까지 푼 비율")이
-- 이것 말고는 셀 데가 없다. 집계가 다시 필요해지면 create view 한 줄이다.

drop view if exists question_stats;
drop table if exists reports;
drop table if exists hidden_answers;
