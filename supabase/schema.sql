-- namekata Supabase 스키마
--
-- 환경 변수 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 넣으면
-- 웹 앱이 파일 저장소 대신 이 테이블들을 쓴다 (web/src/lib/store.ts).
--
-- MVP는 계정별 기록을 남기지 않는다. 제출은 익명이고, 누가 냈는지 저장하지 않는다.

-- 채점 결과(exact·partial)를 제출할 때 같이 적어 둔다. 정답은 questions.json
-- 에 있고 DB에는 없어서, 나중에 세려면 매번 둘을 맞춰 봐야 하기 때문이다.
-- 옛 행은 null 이고 집계에서 빠진다 (비율을 0으로 세면 실제보다 어려워 보인다).
create table if not exists submissions (
  id          bigint generated always as identity primary key,
  question_id text        not null,
  name        text        not null,
  exact       boolean,
  partial     boolean,
  created_at  timestamptz not null default now()
);

create index if not exists submissions_question_idx on submissions (question_id);

-- 이미 만들어 둔 테이블에 붙일 때.
alter table submissions add column if not exists exact   boolean;
alter table submissions add column if not exists partial boolean;

-- 문제별 제출 집계. 목록 화면이 문제 전체의 값을 한 번에 읽는다.
create or replace view question_stats as
  select question_id,
         count(*)                             as total,
         count(*) filter (where partial)      as partial,
         count(*) filter (where exact)        as exact
    from submissions
   where exact is not null
group by question_id;

-- 신고된 답. 숨길지는 관리자가 검수 화면에서 정한다.
create table if not exists reports (
  id          bigint generated always as identity primary key,
  question_id text        not null,
  name        text        not null,
  created_at  timestamptz not null default now()
);

-- 숨긴 답. 집계에서 빠진다.
create table if not exists hidden_answers (
  question_id text        not null,
  name        text        not null,
  created_at  timestamptz not null default now(),
  primary key (question_id, name)
);

-- 문제 검수 결과. 문제 본문은 data/questions.json 에 있고 여기엔 상태만 둔다.
create table if not exists question_reviews (
  question_id text        primary key,
  status      text        not null check (status in ('pending', 'approved', 'rejected')),
  updated_at  timestamptz not null default now()
);

-- 서버(서비스 롤)에서만 접근한다. 브라우저에서 직접 읽고 쓰지 않으므로
-- RLS를 켜고 정책은 두지 않는다. 서비스 롤 키는 RLS를 우회한다.
alter table submissions      enable row level security;
alter table reports          enable row level security;
alter table hidden_answers   enable row level security;
alter table question_reviews enable row level security;
