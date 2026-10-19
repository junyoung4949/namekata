-- 가이드와 장. 제품의 축이 문제에서 가이드로 옮겨간다.
--
-- 본문을 레포 파일(MDX)이 아니라 DB 에 두는 이유는 둘이다. 블로그 쓰듯 자주
-- 고칠 글이라 커밋·배포를 매번 거치면 마찰이 크고, 해설이 장을 가리켜야 해서
-- 양쪽이 같은 곳에 있어야 외래키로 깨진 링크를 막을 수 있다.
--
-- 한국어만 쓴다. 로케일별로 행을 가르던 설계(guide_texts·chapter_texts)는
-- "번역이 뒤처진 상태"를 표현하려던 것이라 근거가 사라졌고, 제목·본문이
-- 부모 테이블의 칸으로 들어왔다.
--
-- null 규칙 — 범주는 null 로 두지 않는다. language = null 이 "공통"을 뜻하면
-- 그건 암묵적 약속이고, where language = 'java' 가 공통 가이드를 조용히
-- 빼먹는다. 범주 칸은 전부 not null + default + check 다. 반면 값의 부재
-- (아직 안 쓴 brief, 출처 없는 자작 가이드)는 null 이 맞다.

-- ---------------------------------------------------------------- 가이드

create table guides (
    -- 주소에 쓰는 이름. /guide/google-java-naming
    slug text primary key,

    -- 이 가이드가 다루는 언어. 'common' 은 언어를 가리지 않는 가이드.
    -- questions.language 에는 'common' 이 없다 — 코드는 반드시 어떤 언어로
    -- 쓰여 있으므로 도메인이 일부러 다르다.
    language text not null default 'common'
        check (language in ('common', 'java', 'python', 'javascript')),

    title text not null,
    -- 홈 카드의 한 줄 소개
    lede  text,

    -- 홈 목록에서의 순서. 10·20·30 으로 띄워 둔다.
    position int  not null default 0,
    status   text not null default 'draft' check (status in ('draft', 'published')),

    -- 출처. CC-BY 3.0 은 저작자 표시와 개작(번역) 사실 명시를 요구한다.
    -- 번역이 아닌 자작 가이드를 쓸 수 있어 null 을 허용한다 — 출처가 없는
    -- 것은 범주가 아니라 값의 부재이고, 화면은 source_url 이 있을 때만
    -- 출처 블록을 그린다.
    source_title   text,
    source_url     text,
    source_license text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table guides is '가이드 한 권. 사람이 쓰고 사람이 고친다 — 추출기가 손대지 않는다.';

-- ---------------------------------------------------------------- 장

create table chapters (
    id bigint generated always as identity primary key,

    guide_slug text not null references guides (slug) on delete cascade,
    -- 주소에 쓰는 장 이름. /guide/google-java-naming/constant-names
    slug       text not null,

    -- 가이드 안에서의 순서. 10·20·30 으로 띄워 둔다.
    --
    -- unique 를 걸지 않는다. 걸면 두 장의 순서를 맞바꿀 때 임시값을 거쳐야
    -- 한다. 읽을 때 (position, id) 로 정렬하면 충돌해도 순서가 정해진다.
    position int not null,

    title text not null,
    -- 장 본문 마크다운. 안의 ```java 펜스는 웹이 highlight.ts 로 보내서
    -- 연습 문제와 같은 IDE 배색으로 그린다.
    body  text not null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- 장 이름은 가이드 안에서만 유일하다. 세 언어 가이드에 전부
    -- class-names 장이 있어도 주소가 안 겹친다.
    unique (guide_slug, slug)
);

create index chapters_order_idx on chapters (guide_slug, position, id);

-- ---------------------------------------------------------------- 문제에 붙는 글

-- 추출기가 questions 를 매번 덮어쓰므로 사람이 쓰는 글은 옆 테이블에 둔다.
-- 베이스라인의 "칸마다 주인을 하나로" 를 그대로 따른다.
create table question_notes (
    question_id text primary key references questions (id) on delete cascade,

    -- 이 함수가 하는 일. 코드 독해 부담을 덜어 네이밍에만 집중시킨다.
    -- 연습 화면의 왼쪽 칸에 들어간다.
    brief text,

    -- 해설. 원저자는 어떤 원칙으로 이 이름을 지었는가. 제출한 뒤에 보인다.
    -- 마크다운이라 장 링크를 문장 안에 넣을 수 있다.
    rationale text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on column question_notes.brief is
    '비어 있으면 그 문제는 가이드에 붙이지 않는다. 별도 상태 칸을 두지 않는다.';

-- ---------------------------------------------------------------- 장 ↔ 문제

create table chapter_questions (
    chapter_id  bigint not null references chapters (id) on delete cascade,
    question_id text   not null references questions (id) on delete cascade,

    -- practice:  이 장 끝에 붙는 연습 문제
    -- reference: 이 문제의 해설이 가리키는 장
    role text not null check (role in ('practice', 'reference')),

    -- practice 일 때 연습 순서. reference 는 0 으로 둔다 — null 로 두면
    -- "순서 없음" 에 뜻이 얹힌다.
    position int not null default 0,

    primary key (chapter_id, question_id, role)
);

-- 해설 화면이 "이 문제가 가리키는 장" 을 역방향으로 읽는다.
create index chapter_questions_by_question on chapter_questions (question_id, role);
