-- namekata 서버 스키마.
--
-- supabase/schema.sql 에 있던 네 테이블과 집계 뷰를 그대로 옮기고, 문제 본문을
-- 담을 questions 를 새로 둔다. 문제는 그동안 data/questions.json 에 있었다.
--
-- 설계 원칙: **칸마다 주인을 하나로.**
--
-- 한 행을 추출기와 사람이 같이 쓰면 import 가 사람의 수정을 덮어쓴다. 그래서
-- 칸을 주인별로 갈라 둔다. import 는 추출기 칸만 건드리고, 사람 칸은 쳐다보지
-- 않는다. 그러면 upsert 규칙이 "추출기 칸 전부 갱신"으로 끝난다.
--
-- RLS 는 켜지 않는다. Supabase 때는 브라우저가 PostgREST 로 직접 붙을 수 있어서
-- 켜 뒀지만, 지금은 이 서버만 DB에 붙는다.

-- ---------------------------------------------------------------- 문제

create table questions (
    -- 추출기가 만든 id: 저장소-커밋-줄번호. 출처가 id 에 그대로 드러난다.
    -- 커밋을 고정해 뽑는 이유가 이것 때문이다 (tools/extract 의 --pin-from).
    id text primary key,

    -- ===== 추출기가 주인인 칸. import 가 매번 덮어쓴다 =====

    language     text     not null check (language in ('java', 'python', 'javascript')),
    kind         text     not null check (kind in ('method', 'variable', 'class')),
    answer       text     not null,
    masked_code  text     not null,
    placeholder  text     not null,
    -- 이 함수를 품은 클래스 이름. 코드 조각 바깥에 있어 따로 들고 온다.
    owner        text,
    -- 떼어낸 원본 주석. 사용자가 감점을 받고 열면 보여준다.
    docstring    text,
    -- 추출기가 코드만 보고 매긴 등급. 표본이 쌓이면 서버가 실측으로 덮어
    -- 내보낸다 (LevelPolicy). 실측값은 제출에서 계산되므로 저장하지 않는다.
    level        smallint not null check (level between 0 and 5),
    -- 자동 검사가 확신하지 못한 자리. 검수 화면이 이 문제를 먼저 보여준다.
    review_flags text[]   not null default '{}',

    repo             text not null,
    commit_hash      text not null,
    file_path        text not null,
    start_line       int  not null,
    end_line         int  not null,
    license          text not null,
    -- 파일 헤더나 LICENSE 에서 읽은 저작권자. 못 찾으면 비어 있다.
    copyright_holder text,

    -- ===== 사람이 주인인 칸. import 가 건드리지 않는다 =====

    status text not null default 'pending'
        check (status in ('pending', 'approved', 'rejected')),
    -- 추출기가 저작권자를 못 찾았거나 잘못 읽었을 때 검수 화면에서 채운다.
    -- copyright_holder 를 직접 고치게 하면 다음 import 가 지워 버린다.
    copyright_holder_override text,

    -- ===== 시스템이 주인인 칸 =====

    -- 추출 결과에서 사라진 문제. 지우지 않는 이유는 제출·신고 기록이 이 id 를
    -- 가리키고 있기 때문이다. 검수 상태와는 별개 사실이라 칸을 따로 둔다 —
    -- 승인된 문제도 소스 파일이 바뀌면 사라질 수 있다.
    retired_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 목록 화면이 "풀 수 있는 문제"를 고르는 조건.
create index questions_playable_idx on questions (status, language) where retired_at is null;
-- 출처 표기 화면이 저장소별로 모아 보여준다.
create index questions_repo_idx on questions (repo);

comment on table questions is
    '추출기(tools/extract)가 만든 문제. import 로 들어오고, 검수는 status 로 한다.';

-- 아래 세 값은 다른 칸에서 계산되므로 저장하지 않는다. 두 벌로 두면 한쪽만
-- 갱신되는 순간 어긋나기 시작한다.
--
--   answer_words  ← answer 를 단어로 쪼갠 것      (Identifier 가 계산)
--   repo_url      ← 'https://github.com/' + repo  (QuestionSource 가 계산)
--   url           ← repo + commit + path + 줄범위 (QuestionSource 가 계산)

-- ---------------------------------------------------------------- 제출

-- 채점 결과를 제출할 때 같이 적어 둔다. 목록 화면이 문제 전체의 집계를 한 번에
-- 읽으므로 읽기가 싸야 한다 — 읽을 때마다 정답과 맞춰 보는 대신 쓸 때 정한다.
create table submissions (
    id          bigint generated always as identity primary key,
    question_id text        not null references questions (id),
    name        text        not null,
    exact       boolean     not null,
    partial     boolean     not null,
    created_at  timestamptz not null default now()
);

create index submissions_question_idx on submissions (question_id);

-- 문제별 제출 집계. 목록 화면이 전체를 한 번에 읽는다.
create view question_stats as
    select question_id,
           count(*)                        as total,
           count(*) filter (where partial) as partial,
           count(*) filter (where exact)   as exact
      from submissions
  group by question_id;

-- ---------------------------------------------------------------- 신고·숨김

-- 신고된 답. 숨길지는 검수 화면에서 사람이 정한다.
create table reports (
    id          bigint generated always as identity primary key,
    question_id text        not null references questions (id),
    name        text        not null,
    created_at  timestamptz not null default now()
);

create index reports_created_idx on reports (created_at desc);

-- 숨긴 답. "다른 사람의 답" 목록에서 빠진다.
create table hidden_answers (
    question_id text        not null references questions (id),
    name        text        not null,
    created_at  timestamptz not null default now(),
    primary key (question_id, name)
);
