-- 자바 네이밍 가이드 시드. 한 번만 돌린다.
--
-- 가이드 본문의 주인은 DB 다. 이 파일은 번역 초고(google-style-naming-ko.md)를
-- 처음 옮겨 넣은 기록이고, 이후 수정은 DB 에서 한다 — 여기서 다시 import 하면
-- 손으로 고친 것을 덮어쓴다.
--
--   psql -d namekata -f tools/seed/google-java-naming.sql

begin;

-- 다시 돌릴 때를 대비해 장을 비우고 시작한다 (cascade 로 연결도 함께).
delete from guides where slug = 'google-java-naming';

insert into guides (slug, language, title, lede, position, status, source_title, source_url, source_license) values
  ('google-java-naming', 'java', '구글 자바 스타일가이드 · 네이밍', '자바 식별자에 이름을 붙이는 규칙. 원문 5장을 장별로 옮겼습니다.', 10, 'published', 'Google Java Style Guide', 'https://google.github.io/styleguide/javaguide.html#s5-naming', 'CC-BY-3.0');

insert into chapters (guide_slug, slug, position, title, body) values
  ('google-java-naming', 'common-rules', 10, '모든 식별자에 공통으로 적용되는 규칙', '식별자에는 ASCII 문자와 숫자만 쓰고, 아래에 명시된 몇몇 경우에만 밑줄을 쓴다. 따라서 유효한 식별자 이름은 모두 정규식 `\w+`에 매치된다.

구글 스타일에서는 **특별한 접두사나 접미사를 쓰지 않는다.** 예를 들어 다음 이름들은 구글 스타일이 아니다.

- `name_`
- `mName`
- `s_name`
- `kName`
'),
  ('google-java-naming', 'class-names', 20, '클래스 이름', '클래스 이름은 **`UpperCamelCase`**로 쓴다.

클래스 이름은 보통 명사 또는 명사구다. 예를 들어 `Character`, `ImmutableList`. 인터페이스 이름도 명사나 명사구일 수 있지만(예: `List`), 때로는 형용사나 형용사구가 되기도 한다(예: `Readable`).

애너테이션 타입의 네이밍에는 특별한 규칙도, 널리 자리 잡은 관례도 없다.

### 테스트 클래스

테스트 클래스는 이름이 `Test`로 끝난다. 예: `HashIntegrationTest`.

단일 클래스를 다루는 테스트라면, 그 클래스 이름에 `Test`를 붙인 이름을 쓴다. 예: `HashImplTest`.
'),
  ('google-java-naming', 'method-names', 30, '메서드 이름', '메서드 이름은 **`lowerCamelCase`**로 쓴다.

메서드 이름은 보통 **동사 또는 동사구**다. 예를 들어 `sendMessage`, `stop`.

### 테스트 메서드

JUnit 테스트 메서드 이름에서는 이름의 논리적 구성 요소를 구분하기 위해 밑줄을 쓸 수 있고, 각 구성 요소는 `lowerCamelCase`로 쓴다.

```java
void transferMoney_deductsFromSource() { ... }
```

테스트 메서드 이름을 짓는 "유일하게 올바른 방법"은 없다.
'),
  ('google-java-naming', 'constant-names', 40, '상수 이름', '상수 이름은 **`UPPER_SNAKE_CASE`**를 쓴다. 전부 대문자이고, 각 단어는 밑줄 하나로 구분한다. 그런데 상수란 정확히 무엇인가?

상수는 `static final` 필드로서, 그 내용이 **깊이(deeply) 불변**이고 그 메서드에 **관측 가능한 부수 효과가 없는** 것이다. 원시 타입, 문자열, 불변 값 클래스, 그리고 `null`로 설정된 모든 것이 그 예다.

인스턴스의 관측 가능한 상태가 바뀔 수 있다면 상수가 아니다. **단지 절대 변경하지 않겠다는 의도만으로는 충분하지 않다.**

```java
// 상수
static final int NUMBER = 5;
static final ImmutableList<String> NAMES = ImmutableList.of("Ed", "Ann");
static final Map<String, Integer> AGES = ImmutableMap.of("Ed", 35, "Ann", 32);
static final Joiner COMMA_JOINER = Joiner.on('',''); // Joiner 가 불변이므로
static final SomeMutableType[] EMPTY_ARRAY = {};

// 상수가 아닌 것
static String nonFinal = "non-final";
final String nonStatic = "non-static";
static final Set<String> mutableCollection = new HashSet<String>();
static final ImmutableSet<SomeMutableType> mutableElements = ImmutableSet.of(mutable);
static final ImmutableMap<String, SomeMutableType> mutableValues =
    ImmutableMap.of("Ed", mutableInstance, "Ann", mutableInstance2);
static final Logger logger = Logger.getLogger(MyClass.getName());
static final String[] nonEmptyArray = {"these", "can", "change"};
```

이 이름들은 보통 명사 또는 명사구다.
'),
  ('google-java-naming', 'field-names', 50, '상수가 아닌 필드 이름', '상수가 아닌 필드 이름은(`static`이든 아니든) **`lowerCamelCase`**로 쓴다.

이 이름들은 보통 명사 또는 명사구다. 예를 들어 `computedValues`, `index`.
'),
  ('google-java-naming', 'parameter-names', 60, '매개변수 이름', '매개변수 이름은 **`lowerCamelCase`**로 쓴다.

public 메서드에서 **한 글자 매개변수 이름은 피해야 한다.**
'),
  ('google-java-naming', 'local-variable-names', 70, '지역 변수 이름', '지역 변수 이름은 **`lowerCamelCase`**로 쓴다.

`final`이고 불변이라 해도 **지역 변수는 상수로 간주하지 않으며**, 상수 스타일로 쓰지 않는다.
'),
  ('google-java-naming', 'type-variable-names', 80, '타입 변수 이름', '타입 변수는 다음 **두 스타일 중 하나**로 이름 짓는다.

- 대문자 한 글자, 뒤에 숫자 한 자리를 선택적으로 붙인다. 예: `E`, `T`, `X`, `T2`
- 클래스에 쓰는 형식의 이름(2장 클래스 이름 참고) 뒤에 대문자 `T`를 붙인다. 예: `RequestT`, `FooBarT`
'),
  ('google-java-naming', 'unnamed-variables', 90, '이름 없는 변수', '이름 없는 변수와 매개변수를 위한 `_` 문법은 적용 가능한 곳이라면 어디서든 허용된다.

```java
Predicate<String> alwaysTrue = _ -> true;
```
'),
  ('google-java-naming', 'camel-case', 100, '카멜 케이스의 정의', '영어 구절을 카멜 케이스로 바꾸는 합리적인 방법이 둘 이상인 경우가 있다. "IPv6"나 "iOS" 같은 약어나 특이한 표기가 섞여 있을 때가 그렇다. 예측 가능성을 높이기 위해 구글 스타일은 다음의 (거의) 결정론적인 절차를 규정한다.

### 절차

이름의 산문 형태에서 시작한다.

1. 구절을 순수 ASCII로 변환하고 아포스트로피를 모두 제거한다. 예를 들어 "Müller''s algorithm"은 "Muellers algorithm"이 된다.
2. 그 결과를 단어 단위로 나눈다. 공백과 남아 있는 구두점(보통 하이픈)에서 쪼갠다.
3. 이제 (약어를 포함해) 전부 소문자로 바꾸고, 다음의 첫 글자만 대문자로 올린다.
    - … 각 단어 → upper camel case
    - … 첫 단어를 제외한 각 단어 → lower camel case
4. 마지막으로 모든 단어를 이어 붙여 하나의 식별자로 만든다.

2단계에는 **권장** 사항이 하나 붙는다. 어떤 단어가 통상적인 용법에서 이미 카멜 케이스 모양이라면 그것을 구성 요소로 쪼갠다("AdWords"는 "ad words"가 된다). 단 "iOS" 같은 단어는 엄밀히 말해 카멜 케이스가 아니다. 어떤 관례도 따르지 않으므로 이 권장 사항이 적용되지 않는다.

원래 단어의 대소문자는 **거의 전적으로 무시된다**는 점에 유의한다.

아주 드문 경우(예: 여러 부분으로 된 버전 번호)에는 인접한 숫자를 구분하기 위해 밑줄을 써야 할 수도 있다. 숫자에는 대문자·소문자 구분이 없기 때문이다.

### 예

| 산문 형태 | 올바름 | 틀림 |
| --- | --- | --- |
| "XML HTTP request" | `XmlHttpRequest` | `XMLHTTPRequest` |
| "new customer ID" | `newCustomerId` | `newCustomerID` |
| "inner stopwatch" | `innerStopwatch` | `innerStopWatch` |
| "supports IPv6 on iOS?" | `supportsIpv6OnIos` | `supportsIPv6OnIOS` |
| "YouTube importer" | `YouTubeImporter` | — |
| "Turn on 2SV" | `turnOn2sv` | `turnOn2Sv` |
| "Guava 33.4.6" | `guava33_4_6` | `guava3346` |

"YouTube importer"는 `YoutubeImporter`도 허용되지만 권장하지는 않는다.

> **참고:** 영어에서 하이픈 사용이 모호한 단어들이 있다. 예를 들어 "nonempty"와 "non-empty"는 둘 다 맞으므로, 메서드 이름 `checkNonempty`와 `checkNonEmpty` 역시 둘 다 맞다.
');

-- 연습 문제. 장에 붙이는 행위가 곧 승인이다.
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'spring-projects-spring-framework-67fe0f4-171', 'practice', 10 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'method-names';
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'spring-projects-spring-framework-67fe0f4-266', 'practice', 20 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'method-names';
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'google-guava-b0ab782-93', 'practice', 30 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'method-names';
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'spring-projects-spring-framework-67fe0f4-336v341', 'practice', 10 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'local-variable-names';
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'spring-projects-spring-framework-67fe0f4-354v359', 'practice', 20 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'local-variable-names';

-- 해설이 가리키는 장.
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'spring-projects-spring-framework-67fe0f4-171', 'reference', 0 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'method-names';
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'google-guava-b0ab782-93', 'reference', 0 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'camel-case';
insert into chapter_questions (chapter_id, question_id, role, position)
select c.id, 'spring-projects-spring-framework-67fe0f4-336v341', 'reference', 0 from chapters c where c.guide_slug = 'google-java-naming' and c.slug = 'local-variable-names';

-- 문제에 붙는 사람의 글. 추출기가 questions 를 덮어써도 여기는 남는다.
insert into question_notes (question_id, brief, rationale) values
  ('spring-projects-spring-framework-67fe0f4-171', '`CharSequence` 하나를 받아 `true`/`false`를 돌려줍니다. **공백이 아닌 글자가 하나라도 있으면** `true`입니다.

- `true`: `"a"`, `" a "`, `"  .  "`
- `false`: `null`, `""`, `"   "`', '불리언을 돌려주는 판정이라 `has`로 시작합니다. 뒤에 오는 것은 "무엇이 있는가"이고, 여기서는 공백이 아닌 실제 글자 — 즉 `text`입니다.

같은 클래스에 `hasLength`가 따로 있습니다. 그쪽은 길이만 보고, 이쪽은 내용까지 봅니다. 접두사를 공유하고 뒤 단어만 바꿔서 둘이 짝이라는 게 목록에서 바로 보입니다.')
on conflict (question_id) do update set brief = excluded.brief, rationale = excluded.rationale, updated_at = now();
insert into question_notes (question_id, brief, rationale) values
  ('spring-projects-spring-framework-67fe0f4-266', '`CharSequence`를 받아 **공백 문자를 전부 없앤** 결과를 돌려줍니다. 앞뒤뿐 아니라 **가운데 공백까지** 없앱니다.

- `" a b c "` → `"abc"`
- 비었거나 `null`이면 받은 것을 그대로 돌려줍니다', '공백을 쳐내는 동작은 영어권 코드에서 `trim`으로 굳어 있습니다. 다만 `trim`만 쓰면 보통 **앞뒤만** 잘라낸다는 뜻이라, 가운데까지 없앤다는 점을 `All`로 구별합니다. 대상은 `Whitespace`입니다.

메서드 이름은 동사로 시작한다는 3장의 규칙이 그대로 보이는 예입니다.')
on conflict (question_id) do update set brief = excluded.brief, rationale = excluded.rationale, updated_at = now();
insert into question_notes (question_id, brief, rationale) values
  ('google-guava-b0ab782-93', '문자열, 최소 길이, 채울 문자 하나를 받습니다. 문자열이 최소 길이보다 짧으면 **앞쪽에** 그 문자를 반복해 붙여 길이를 맞춥니다. 이미 길면 받은 문자열을 그대로 돌려줍니다.

- `("7", 3, ''0'')` → `"007"`
- `("2010", 3, ''0'')` → `"2010"`', '채워 넣는 동작은 `pad`입니다. 남는 건 "어디를 채우는가"인데, 앞쪽이면 `Start`, 뒤쪽이면 `End`입니다. 실제로 Guava에는 `padEnd`가 나란히 있습니다.

짝을 이루는 메서드는 **앞 단어를 공유하고 뒤 단어만 바꾸면** 자동완성 목록에서 나란히 붙습니다. `padStart`/`padEnd`가 `startPad`/`endPad`보다 나은 이유입니다.')
on conflict (question_id) do update set brief = excluded.brief, rationale = excluded.rationale, updated_at = now();
insert into question_notes (question_id, brief, rationale) values
  ('spring-projects-spring-framework-67fe0f4-336v341', '`trimLeadingCharacter` 안의 **지역 변수**입니다. 0에서 시작해 앞쪽의 지정된 문자를 건너뛰며 하나씩 올라가고, 마지막에 `substring`의 **시작 위치**로 쓰입니다.', '잘라낼 지점을 가리키는 번호입니다. 앞에서부터 세므로 `begin`, 번호이므로 `index`입니다.

다만 원저자는 `index`를 `Idx`로 줄여 썼습니다. **구글 스타일은 단어 내부 글자를 지워 줄이는 것을 권하지 않습니다**(1장). 규칙대로라면 `beginIndex`입니다 — 규칙과 실제 코드가 어긋나는 자리입니다.')
on conflict (question_id) do update set brief = excluded.brief, rationale = excluded.rationale, updated_at = now();

insert into question_notes (question_id, brief, rationale) values
  ('spring-projects-spring-framework-67fe0f4-354v359', '`trimTrailingCharacter` 안의 **지역 변수**입니다. 문자열 맨 끝에서 시작해 뒤쪽의 지정된 문자를 건너뛰며 하나씩 내려가고, 마지막에 `substring`의 **끝 위치**로 쓰입니다.', '앞 문제와 짝입니다. 한쪽은 앞에서부터, 한쪽은 뒤에서부터 센 번호이고, **`begin`/`end`가 서로를 가리키는 쌍**이라 둘을 나란히 두면 뜻이 분명해집니다.

`Idx` 축약도 같이 따라옵니다. 한 파일 안에서 같은 축약을 일관되게 쓰는 것과, 애초에 축약하지 않는 것 중 어느 쪽이 나은지는 저장소마다 답이 다릅니다.')
on conflict (question_id) do update set brief = excluded.brief, rationale = excluded.rationale, updated_at = now();

-- ── 누출 검사 ───────────────────────────────────────────────────
--
-- 한 가이드에 붙인 문제끼리 서로의 답을 보여주지 않는지 본다.
--
-- 처음 시드를 돌렸을 때 실제로 걸린 일이다. hasText(메서드 문제)와
-- strLen(지역 변수 문제)은 **같은 함수에서 뽑은 것**이라, 변수 문제의
-- 코드에 메서드 이름이 그대로 보이고 메서드 문제의 코드에 변수 이름이
-- 그대로 보였다. 서로가 서로의 답이었다.
--
-- 걸리면 둘 중 하나를 다른 문제로 바꾼다. 가이드마다 돌려 볼 것.
do $$
declare leaked text;
begin
    select string_agg(format('%s 의 답(%s)이 %s 의 코드에 보인다',
                             a.question_id, qa.answer, b.question_id), E'\n')
      into leaked
      from chapter_questions a
      join chapters ca on ca.id = a.chapter_id
      join questions qa on qa.id = a.question_id
      join chapter_questions b on b.question_id <> a.question_id
      join chapters cb on cb.id = b.chapter_id and cb.guide_slug = ca.guide_slug
      join questions qb on qb.id = b.question_id
     where ca.guide_slug = 'google-java-naming'
       and a.role = 'practice' and b.role = 'practice'
       and qb.masked_code like '%' || qa.answer || '%';

    if leaked is not null then
        raise exception E'연습 문제가 서로의 답을 보여준다:\n%', leaked;
    end if;
end $$;

commit;
