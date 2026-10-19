-- 사람이 직접 쓰는 문제.
--
-- 지금까지 문제는 추출기만 만들었다. 가이드를 쓰다가 "이 장에는 이런 문제가
-- 필요한데" 싶을 때, 113개 중에서 고르는 수밖에 없었다. 글을 쓰는 흐름과
-- 맞지 않는다 — 장을 쓰고, 거기 맞는 문제를 그 자리에서 만들고, 다음 장을
-- 쓰는 식이어야 한다.
--
-- 출처가 문제다. 추출기가 가져온 코드는 라이선스 표기 의무가 있어서
-- repo·commit·file·license 가 전부 not null 이었다. 그런데 사람이 설명을
-- 위해 지어낸 예시 코드에는 표기할 원문이 없다.
--
-- guides 에서 "번역 vs 자작" 을 가른 것과 같은 방식으로 푼다. 어디서 왔는지를
-- **값으로 적고**(origin), 출처 칸은 null 을 허용하되, 추출된 문제는 여전히
-- 출처가 있어야 한다는 것을 제약으로 못 박는다. null 로 범주를 나타내지
-- 않는다 — where repo is null 이 "자작" 을 뜻하게 두면 그건 암묵적 약속이다.

alter table questions
    add column origin text not null default 'extracted'
        check (origin in ('extracted', 'authored'));

comment on column questions.origin is
    'extracted: 추출기가 가져온 오픈소스 코드 (출처 표기 의무). authored: 사람이 쓴 문제.';

-- 자작 문제는 채울 수 없는 칸들.
alter table questions
    alter column repo        drop not null,
    alter column commit_hash drop not null,
    alter column file_path   drop not null,
    alter column start_line  drop not null,
    alter column end_line    drop not null,
    alter column license     drop not null;

-- 대신 추출된 문제에는 출처가 반드시 있어야 한다. not null 을 떼면서 잃은
-- 보장을 여기서 되찾는다 — 추출기 버그로 표기 없는 코드가 올라오는 일은
-- 여전히 DB 가 막는다.
alter table questions
    add constraint questions_extracted_needs_source
        check (
            origin <> 'extracted'
            or (repo is not null
                and commit_hash is not null
                and file_path is not null
                and license is not null)
        );

-- 자작 문제는 반대로 출처가 비어 있어야 한다. 반쯤 채워 두면 화면이 어느
-- 쪽으로 그려야 할지 모른다.
alter table questions
    add constraint questions_authored_has_no_source
        check (origin <> 'authored' or repo is null);
