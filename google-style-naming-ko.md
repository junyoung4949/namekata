# 구글 스타일가이드 — 네이밍 규칙 (한국어 번역)

출처: <https://google.github.io/styleguide/>

- Java: [Google Java Style Guide — 5 Naming](https://google.github.io/styleguide/javaguide.html#s5-naming)
- Python: [Google Python Style Guide — 3.16 Naming](https://google.github.io/styleguide/pyguide.html#316-naming)
- JavaScript: [Google JavaScript Style Guide — 6 Naming](https://google.github.io/styleguide/jsguide.html#naming)

> 각 언어의 네이밍 관련 절만 발췌해 번역했다. 식별자·코드·케이스 표기(`UpperCamelCase`, `lower_with_under` 등)는 원문 그대로 두었다.

---

## 목차

- [Java](#java)
  - [5.1 모든 식별자에 공통으로 적용되는 규칙](#51-모든-식별자에-공통으로-적용되는-규칙)
  - [5.2 식별자 종류별 규칙](#52-식별자-종류별-규칙)
  - [5.3 카멜 케이스의 정의](#53-카멜-케이스의-정의)
- [Python](#python)
  - [3.16.1 피해야 할 이름](#3161-피해야-할-이름)
  - [3.16.2 네이밍 관례](#3162-네이밍-관례)
  - [3.16.3 파일 이름](#3163-파일-이름)
  - [3.16.4 Guido의 권고에서 유래한 지침](#3164-guido의-권고에서-유래한-지침)
  - [3.16.5 수학적 표기](#3165-수학적-표기)
- [JavaScript](#javascript)
  - [6.1 모든 식별자에 공통으로 적용되는 규칙](#61-모든-식별자에-공통으로-적용되는-규칙)
  - [6.2 식별자 종류별 규칙](#62-식별자-종류별-규칙)
  - [6.3 카멜 케이스의 정의](#63-카멜-케이스의-정의)
- [세 언어 비교 요약](#세-언어-비교-요약)

---

# Java

## 5.1 모든 식별자에 공통으로 적용되는 규칙

식별자에는 ASCII 문자와 숫자만 쓰고, 아래에 명시된 몇몇 경우에만 밑줄을 쓴다. 따라서 유효한 식별자 이름은 모두 정규식 `\w+`에 매치된다.

구글 스타일에서는 특별한 접두사나 접미사를 쓰지 않는다. 예를 들어 다음 이름들은 구글 스타일이 아니다: `name_`, `mName`, `s_name`, `kName`.

## 5.2 식별자 종류별 규칙

### 5.2.1 패키지와 모듈 이름

패키지와 모듈 이름에는 소문자와 숫자만 쓴다(밑줄 금지). 연속된 단어는 그냥 붙여 쓴다. 예를 들어 `com.example.deepspace`로 쓰고, `com.example.deepSpace`나 `com.example.deep_space`로 쓰지 않는다.

### 5.2.2 클래스 이름

클래스 이름은 `UpperCamelCase`로 쓴다.

클래스 이름은 보통 명사 또는 명사구다. 예를 들어 `Character`, `ImmutableList`. 인터페이스 이름도 명사나 명사구일 수 있지만(예: `List`), 때로는 형용사나 형용사구가 되기도 한다(예: `Readable`).

애너테이션 타입의 네이밍에는 특별한 규칙도, 널리 자리 잡은 관례도 없다.

테스트 클래스는 이름이 `Test`로 끝난다. 예: `HashIntegrationTest`. 단일 클래스를 다루는 테스트라면, 그 클래스 이름에 `Test`를 붙인 이름을 쓴다. 예: `HashImplTest`.

### 5.2.3 메서드 이름

메서드 이름은 `lowerCamelCase`로 쓴다.

메서드 이름은 보통 동사 또는 동사구다. 예를 들어 `sendMessage`, `stop`.

JUnit 테스트 메서드 이름에서는 이름의 논리적 구성 요소를 구분하기 위해 밑줄을 쓸 수 있고, 각 구성 요소는 `lowerCamelCase`로 쓴다. 예: `transferMoney_deductsFromSource`. 테스트 메서드 이름을 짓는 "유일하게 올바른 방법"은 없다.

### 5.2.4 상수 이름

상수 이름은 `UPPER_SNAKE_CASE`를 쓴다. 전부 대문자이고, 각 단어는 밑줄 하나로 구분한다. 그런데 상수란 정확히 무엇인가?

상수는 `static final` 필드로서, 그 내용이 깊이(deeply) 불변이고 그 메서드에 관측 가능한 부수 효과가 없는 것이다. 원시 타입, 문자열, 불변 값 클래스, 그리고 `null`로 설정된 모든 것이 그 예다. 인스턴스의 관측 가능한 상태가 바뀔 수 있다면 상수가 아니다. 단지 절대 변경하지 않겠다는 의도만으로는 충분하지 않다. 예:

```java
// 상수
static final int NUMBER = 5;
static final ImmutableList<String> NAMES = ImmutableList.of("Ed", "Ann");
static final Map<String, Integer> AGES = ImmutableMap.of("Ed", 35, "Ann", 32);
static final Joiner COMMA_JOINER = Joiner.on(','); // Joiner 가 불변이므로
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

### 5.2.5 상수가 아닌 필드 이름

상수가 아닌 필드 이름은(`static`이든 아니든) `lowerCamelCase`로 쓴다.

이 이름들은 보통 명사 또는 명사구다. 예를 들어 `computedValues`, `index`.

### 5.2.6 매개변수 이름

매개변수 이름은 `lowerCamelCase`로 쓴다.

public 메서드에서 한 글자 매개변수 이름은 피해야 한다.

### 5.2.7 지역 변수 이름

지역 변수 이름은 `lowerCamelCase`로 쓴다.

`final`이고 불변이라 해도 지역 변수는 상수로 간주하지 않으며, 상수 스타일로 쓰지 않는다.

### 5.2.8 타입 변수 이름

타입 변수는 다음 두 스타일 중 하나로 이름 짓는다.

- 대문자 한 글자, 뒤에 숫자 한 자리를 선택적으로 붙인다(예: `E`, `T`, `X`, `T2`).
- 클래스에 쓰는 형식의 이름(5.2.2 클래스 이름 참고) 뒤에 대문자 `T`를 붙인다(예: `RequestT`, `FooBarT`).

### 5.2.9 이름 없는 변수

이름 없는 변수와 매개변수를 위한 `_` 문법은 적용 가능한 곳이라면 어디서든 허용된다. 예:

```java
Predicate<String> alwaysTrue = _ -> true;
```

## 5.3 카멜 케이스의 정의

영어 구절을 카멜 케이스로 바꾸는 합리적인 방법이 둘 이상인 경우가 있다. "IPv6"나 "iOS" 같은 약어나 특이한 표기가 섞여 있을 때가 그렇다. 예측 가능성을 높이기 위해 구글 스타일은 다음의 (거의) 결정론적인 절차를 규정한다.

이름의 산문(prose) 형태에서 시작한다.

1. 구절을 순수 ASCII로 변환하고 아포스트로피를 모두 제거한다. 예를 들어 "Müller's algorithm"은 "Muellers algorithm"이 된다.
2. 그 결과를 단어 단위로 나눈다. 공백과 남아 있는 구두점(보통 하이픈)에서 쪼갠다.
   - **권장:** 어떤 단어가 통상적인 용법에서 이미 카멜 케이스 모양이라면, 그것을 구성 요소로 쪼갠다(예: "AdWords"는 "ad words"가 된다). 단 "iOS" 같은 단어는 엄밀히 말해 카멜 케이스가 아니다. 어떤 관례도 따르지 않으므로 이 권장 사항이 적용되지 않는다.
3. 이제 (약어를 포함해) 전부 소문자로 바꾸고, 다음의 첫 글자만 대문자로 올린다.
   - … 각 단어 → upper camel case
   - … 첫 단어를 제외한 각 단어 → lower camel case
4. 마지막으로 모든 단어를 이어 붙여 하나의 식별자로 만든다.

원래 단어의 대소문자는 거의 전적으로 무시된다는 점에 유의한다.

아주 드문 경우(예: 여러 부분으로 된 버전 번호)에는 인접한 숫자를 구분하기 위해 밑줄을 써야 할 수도 있다. 숫자에는 대문자·소문자 구분이 없기 때문이다.

예:

| 산문 형태 | 올바름 | 틀림 |
|---|---|---|
| "XML HTTP request" | `XmlHttpRequest` | `XMLHTTPRequest` |
| "new customer ID" | `newCustomerId` | `newCustomerID` |
| "inner stopwatch" | `innerStopwatch` | `innerStopWatch` |
| "supports IPv6 on iOS?" | `supportsIpv6OnIos` | `supportsIPv6OnIOS` |
| "YouTube importer" | `YouTubeImporter`<br>`YoutubeImporter`\* | |
| "Turn on 2SV" | `turnOn2sv` | `turnOn2Sv` |
| "Guava 33.4.6" | `guava33_4_6` | `guava3346` |

\* 허용되지만 권장하지는 않는다.

**참고:** 영어에서 하이픈 사용이 모호한 단어들이 있다. 예를 들어 "nonempty"와 "non-empty"는 둘 다 맞으므로, 메서드 이름 `checkNonempty`와 `checkNonEmpty` 역시 둘 다 맞다.

---

# Python

## 3.16 네이밍

`module_name`, `package_name`, `ClassName`, `method_name`, `ExceptionName`, `function_name`, `GLOBAL_CONSTANT_NAME`, `global_var_name`, `instance_var_name`, `function_parameter_name`, `local_var_name`, `query_proper_noun_for_thing`, `send_acronym_via_https`.

이름은 설명적이어야 한다. 함수, 클래스, 변수, 속성, 파일, 그 밖의 모든 이름 붙은 대상에 해당한다.

축약은 피한다. 특히 프로젝트 외부 독자에게 모호하거나 익숙하지 않은 축약어는 쓰지 말고, 단어 내부의 글자를 지워서 줄이지도 않는다.

파일 확장자는 항상 `.py`를 쓴다. 하이픈은 절대 쓰지 않는다.

### 3.16.1 피해야 할 이름

- **한 글자 이름.** 단, 다음의 명시적으로 허용된 경우는 예외다.
  - 카운터나 반복자(예: `i`, `j`, `k`, `v` 등)
  - `try`/`except` 문에서 예외 식별자로 쓰는 `e`
  - `with` 문에서 파일 핸들로 쓰는 `f`
  - 제약이 없는 비공개 타입 변수(예: `_T = TypeVar("_T")`, `_P = ParamSpec("_P")`)
  - 참고 논문이나 알고리즘에서 자리 잡은 표기와 일치하는 이름([수학적 표기](#3165-수학적-표기) 참고)

  한 글자 네이밍을 남용하지 않도록 유의하자. 일반적으로 설명력은 이름의 가시성 범위(scope)에 비례해야 한다. 예를 들어 `i`는 5줄짜리 코드 블록에서는 괜찮은 이름이지만, 여러 겹으로 중첩된 범위 안에서는 너무 막연할 가능성이 높다.

- 패키지/모듈 이름에 들어가는 하이픈(`-`)
- `__double_leading_and_trailing_underscore__` 형태의 이름(파이썬이 예약)
- 불쾌감을 주는 표현
- 변수의 타입을 불필요하게 포함한 이름(예: `id_to_name_dict`)

### 3.16.2 네이밍 관례

- 일반적으로 [PEP 8](https://peps.python.org/pep-0008/#prescriptive-naming-conventions)의 네이밍 관례를 따른다.
- "내부(internal)"란 모듈 내부이거나, 클래스 안에서 protected 또는 private이라는 뜻이다.
- 밑줄 하나(`_`)를 앞에 붙이면 모듈 변수와 함수를 보호하는 데 어느 정도 도움이 된다(린터가 protected 멤버 접근을 지적한다). 단, 단위 테스트가 테스트 대상 모듈의 protected 상수에 접근하는 것은 괜찮다.
- 인스턴스 변수나 메서드에 밑줄 둘(`__`, 이른바 "던더")을 앞에 붙이면 이름 맹글링(name mangling)을 통해 사실상 그 클래스에 private이 된다. 하지만 가독성과 테스트 용이성을 해치고 실제로 완전한 private도 아니므로 사용을 권하지 않는다. 밑줄 하나를 쓰는 편이 낫다.
- 관련 있는 클래스와 최상위 함수는 한 모듈에 함께 둔다. 자바와 달리 모듈당 클래스 하나로 제한할 필요가 없다.
- 클래스 이름에는 `CapWords`를 쓰되, 모듈 이름에는 `lower_with_under.py`를 쓴다. `CapWords.py`로 된 오래된 모듈이 일부 있지만, 모듈 이름이 마침 클래스 이름과 같을 때 혼란스럽기 때문에 이제는 권장하지 않는다. ("잠깐 — 내가 `import StringIO`라고 썼나, `from StringIO import StringIO`라고 썼나?")
- PEP 8은 이렇게 말한다는 점에 유의한다. "`CapWords`에서 약어를 쓸 때는 약어의 모든 글자를 대문자로 쓴다. 따라서 `HttpServerError`보다 `HTTPServerError`가 낫다."
- 새로 만드는 단위 테스트 파일은 PEP 8을 따르는 `lower_with_under` 메서드 이름을 쓴다. 예: `test_<method_under_test>_<state>`. `CapWords` 함수 이름을 쓰는 레거시 모듈과의 일관성을 위해서는, `test`로 시작하는 메서드 이름에 밑줄을 넣어 이름의 논리적 구성 요소를 구분할 수 있다. 가능한 패턴 하나는 `test<MethodUnderTest>_<state>`다.

#### 3.16.2.1 예외

위의 일반적인 네이밍 관례에는 다음 예외가 적용된다.

- 파이썬 코드가 외부 코드베이스나 비(非)파이썬 코드베이스와 긴밀하게 결합된 경우(C++로의 FFI 등), 그쪽 코드베이스와의 일관성을 위해 다른 관례를 따르는 것이 정당할 수 있다.

### 3.16.3 파일 이름

파이썬 파일 이름은 `.py` 확장자를 가져야 하고 하이픈(`-`)을 포함해서는 안 된다. 그래야 임포트하고 단위 테스트할 수 있다. 확장자 없이 실행 파일로 접근하고 싶다면, 심볼릭 링크를 쓰거나 `exec "$0.py" "$@"`가 담긴 간단한 bash 래퍼를 쓴다.

### 3.16.4 Guido의 권고에서 유래한 지침

| 종류 | 공개(Public) | 내부(Internal) |
|---|---|---|
| 패키지 | `lower_with_under` | |
| 모듈 | `lower_with_under` | `_lower_with_under` |
| 클래스 | `CapWords` | `_CapWords` |
| 예외 | `CapWords` | |
| 함수 | `lower_with_under()` | `_lower_with_under()` |
| 전역/클래스 상수 | `CAPS_WITH_UNDER` | `_CAPS_WITH_UNDER` |
| 전역/클래스 변수 | `lower_with_under` | `_lower_with_under` |
| 인스턴스 변수 | `lower_with_under` | `_lower_with_under` (protected) |
| 메서드 이름 | `lower_with_under()` | `_lower_with_under()` (protected) |
| 함수/메서드 매개변수 | `lower_with_under` | |
| 지역 변수 | `lower_with_under` | |

### 3.16.5 수학적 표기

수학 비중이 큰 코드에서는, 평소라면 스타일가이드를 위반할 짧은 변수 이름이 참고 논문이나 알고리즘에서 자리 잡은 표기와 일치한다면 그 이름이 더 낫다.

자리 잡은 표기에 기반한 이름을 쓸 때는 다음을 지킨다.

1. 모든 네이밍 관례의 출처를 주석이나 독스트링에 인용한다. 되도록 학술 자료 자체로 가는 하이퍼링크를 넣는다. 출처에 접근할 수 없다면 네이밍 관례를 명확히 문서화한다.
2. 공개 API에는 PEP 8을 따르는 `descriptive_names`를 선호한다. 공개 API는 맥락 밖에서 마주칠 가능성이 훨씬 크다.
3. 경고를 끌 때는 범위를 좁게 잡은 `pylint: disable=invalid-name` 지시문을 쓴다. 변수가 몇 개뿐이라면 각각에 줄 끝 주석으로 달고, 더 많다면 블록 시작 부분에 적용한다.

---

# JavaScript

## 6.1 모든 식별자에 공통으로 적용되는 규칙

식별자에는 ASCII 문자와 숫자만 쓰고, 아래에 명시된 몇몇 경우에만 밑줄을 쓰며, 아주 드물게(Angular 같은 프레임워크가 요구할 때) 달러 기호를 쓴다.

합리적인 범위 안에서 최대한 설명적인 이름을 쓴다. 가로 공간을 아끼는 데 신경 쓰지 말자. 코드를 처음 읽는 사람이 바로 이해할 수 있게 만드는 것이 훨씬 더 중요하다. 프로젝트 외부 독자에게 모호하거나 익숙하지 않은 축약어는 쓰지 말고, 단어 내부의 글자를 지워서 줄이지도 않는다.

```javascript
errorCount          // 축약 없음.
dnsConnectionIndex  // "DNS"가 무엇의 약자인지 대부분 안다.
referrerUrl         // "URL"도 마찬가지.
customerId          // "Id"는 널리 쓰이고 오해될 일이 없다.
```

허용되지 않음:

```javascript
n                   // 의미 없음.
nErr                // 모호한 축약.
nCompConns          // 모호한 축약.
wgcConnections      // 당신 팀만 무슨 뜻인지 안다.
pcReader            // "pc"로 줄일 수 있는 것이 너무 많다.
cstmrId             // 단어 내부 글자를 삭제했다.
kSecondsPerDay      // 헝가리안 표기법은 쓰지 않는다.
```

**예외:** 스코프가 10줄 이하인 변수(공개 API의 일부가 아닌 인자 포함)는 짧은 이름(예: 한 글자)을 쓸 수 있다.

## 6.2 식별자 종류별 규칙

### 6.2.1 패키지 이름

패키지 이름은 전부 `lowerCamelCase`다. 예를 들어 `my.exampleCode.deepSpace`로 쓰고, `my.examplecode.deepspace`나 `my.example_code.deep_space`로 쓰지 않는다.

**예외:** 패키지 이름이 타입스크립트의 경로 기반 패턴을 따를 수 있다. 이 경우 보통 전부 소문자이며, 파일 이름에 밑줄이 있으면 밑줄을 쓴다.

### 6.2.2 클래스 이름

클래스, 인터페이스, 레코드, typedef 이름은 `UpperCamelCase`로 쓴다. 내보내지 않는(unexported) 클래스는 그냥 지역 변수일 뿐이며, `@private`로 표시하지 않는다.

타입 이름은 보통 명사 또는 명사구다. 예를 들어 `Request`, `ImmutableView`, `VisibilityMode`. 또한 인터페이스 이름은 때로 형용사나 형용사구가 되기도 한다(예: `Readable`).

### 6.2.3 메서드 이름

메서드 이름은 `lowerCamelCase`로 쓴다. `@private` 메서드의 이름은 끝에 밑줄을 붙여도 된다(선택).

메서드 이름은 보통 동사 또는 동사구다. 예를 들어 `sendMessage`, `stop_`. 프로퍼티의 게터·세터 메서드는 결코 필수가 아니지만, 쓴다면 `getFoo`(불리언이라면 선택적으로 `isFoo` 또는 `hasFoo`), 세터는 `setFoo(value)`로 이름 지어야 한다.

JsUnit 테스트 메서드 이름에서도 이름의 논리적 구성 요소를 구분하기 위해 밑줄을 쓸 수 있다. 전형적인 패턴 하나는 `test<MethodUnderTest>_<state>_<expectedOutcome>`이다. 예: `testPop_emptyStack_throws`. 테스트 메서드 이름을 짓는 "유일하게 올바른 방법"은 없다.

### 6.2.4 열거형(enum) 이름

열거형 이름은 클래스와 비슷하게 `UpperCamelCase`로 쓰고, 대개 단수 명사여야 한다. 열거형 안의 개별 항목은 `CONSTANT_CASE`로 이름 짓는다.

### 6.2.5 상수 이름

상수 이름은 `CONSTANT_CASE`를 쓴다. 전부 대문자이고 단어는 밑줄로 구분한다. 상수 이름을 끝에 밑줄을 붙여 지을 이유는 없다. private static 프로퍼티는 (암묵적으로 private인) 모듈 지역 변수로 대체할 수 있기 때문이다.

#### 6.2.5.1 "상수"의 정의

모든 상수는 `@const` static 프로퍼티이거나 모듈 지역 `const` 선언이지만, 모든 `@const` static 프로퍼티와 모듈 지역 `const`가 상수인 것은 아니다. 상수 케이스를 선택하기 전에, 그 필드가 정말로 깊이 불변인 상수처럼 느껴지는지 생각해 보자. 예를 들어 그 인스턴스의 관측 가능한 상태가 바뀔 수 있다면 거의 확실히 상수가 아니다. 단지 객체를 절대 변경하지 않겠다는 의도만으로는 일반적으로 충분하지 않다.

예:

```javascript
// 상수
const NUMBER = 5;
/** @const */ exports.NAMES = goog.debug.freeze(['Ed', 'Ann']);
/** @enum */ exports.SomeEnum = { ENUM_CONSTANT: 'value' };

// 상수가 아닌 것
let letVariable = 'non-const';

class MyClass {
  constructor() { /** @const {string} */ this.nonStatic = 'non-static'; }
};
/** @type {string} */
MyClass.staticButMutable = 'not @const, can be reassigned';

const /** Set<string> */ mutableCollection = new Set();

const /** MyImmutableContainer<SomeMutableType> */ stillMutable =
    new MyImmutableContainer(mutableInner);

const {Foo} = goog.require('my.foo');  // 임포트한 이름을 그대로 반영

const logger = log.getLogger('loggers.are.not.immutable');
```

상수의 이름은 보통 명사 또는 명사구다.

#### 6.2.5.2 지역 별칭(alias)

완전히 정규화된 이름보다 가독성이 좋아지는 경우라면 언제든 지역 별칭을 써야 한다. `goog.require`와 같은 규칙(3.6 `goog.require` 및 `goog.requireType` 문)을 따라, 별칭이 가리키는 이름의 마지막 부분을 유지한다. 별칭은 함수 내부에서도 쓸 수 있다. 별칭은 반드시 `const`여야 한다.

예:

```javascript
const staticHelper = importedNamespace.staticHelper;
const CONSTANT_NAME = ImportedClass.CONSTANT_NAME;
const {assert, assertInstanceof} = asserts;
```

### 6.2.6 상수가 아닌 필드 이름

상수가 아닌 필드 이름은(`static`이든 아니든) `lowerCamelCase`로 쓰며, private 필드라면 끝에 밑줄을 붙여도 된다(선택).

이 이름들은 보통 명사 또는 명사구다. 예를 들어 `computedValues`, `index_`.

### 6.2.7 매개변수 이름

매개변수 이름은 `lowerCamelCase`로 쓴다. 매개변수가 생성자를 받는 경우에도 마찬가지라는 점에 유의한다.

public 메서드에서는 한 글자 매개변수 이름을 쓰지 않아야 한다.

**예외:** 서드파티 프레임워크가 요구하는 경우, 매개변수 이름이 `$`로 시작할 수 있다. 이 예외는 다른 식별자(예: 지역 변수나 프로퍼티)에는 적용되지 않는다.

### 6.2.8 지역 변수 이름

지역 변수 이름은 `lowerCamelCase`로 쓴다. 단 위에서 설명한 모듈 지역(최상위) 상수는 예외다. 함수 스코프 안의 상수는 여전히 `lowerCamelCase`로 이름 짓는다. 변수가 생성자를 담고 있어도 `lowerCamelCase`를 쓴다는 점에 유의한다.

### 6.2.9 템플릿 매개변수 이름

템플릿 타입 매개변수 이름은 간결한 한 단어 또는 한 글자 식별자여야 하며, 전부 대문자여야 한다. 예: `TYPE`, `THIS`.

### 6.2.10 모듈 지역 이름

내보내지 않는 모듈 지역 이름은 암묵적으로 private이다. `@private`로 표시하지 않는다. 클래스, 함수, 변수, 상수, 열거형, 그 밖의 모듈 지역 식별자 모두에 적용된다.

## 6.3 카멜 케이스의 정의

영어 구절을 카멜 케이스로 바꾸는 합리적인 방법이 둘 이상인 경우가 있다. "IPv6"나 "iOS" 같은 약어나 특이한 표기가 섞여 있을 때가 그렇다. 예측 가능성을 높이기 위해 구글 스타일은 다음의 (거의) 결정론적인 절차를 규정한다.

이름의 산문(prose) 형태에서 시작한다.

1. 구절을 순수 ASCII로 변환하고 아포스트로피를 모두 제거한다. 예를 들어 "Müller's algorithm"은 "Muellers algorithm"이 된다.
2. 그 결과를 단어 단위로 나눈다. 공백과 남아 있는 구두점(보통 하이픈)에서 쪼갠다.
   - **권장:** 어떤 단어가 통상적인 용법에서 이미 카멜 케이스 모양이라면, 그것을 구성 요소로 쪼갠다(예: "AdWords"는 "ad words"가 된다). 단 "iOS" 같은 단어는 엄밀히 말해 카멜 케이스가 아니다. 어떤 관례도 따르지 않으므로 이 권장 사항이 적용되지 않는다.
3. 이제 (약어를 포함해) 전부 소문자로 바꾸고, 다음의 첫 글자만 대문자로 올린다.
   - … 각 단어 → `UpperCamelCase`
   - … 첫 단어를 제외한 각 단어 → `lowerCamelCase`
4. 마지막으로 모든 단어를 이어 붙여 하나의 식별자로 만든다.

원래 단어의 대소문자는 거의 전적으로 무시된다는 점에 유의한다.

`lowerCamelCase` 예:

| 산문 형태 | 올바름 | 틀림 |
|---|---|---|
| "XML HTTP request" | `xmlHttpRequest` | `XMLHTTPRequest` |
| "new customer ID" | `newCustomerId` | `newCustomerID` |
| "inner stopwatch" | `innerStopwatch` | `innerStopWatch` |
| "supports IPv6 on iOS?" | `supportsIpv6OnIos` | `supportsIPv6OnIOS` |
| "YouTube importer" | `youTubeImporter` | `youtubeImporter`\* |

\* 허용되지만 권장하지는 않는다.

`UpperCamelCase` 예시는 위의 올바른 `lowerCamelCase` 예시에서 첫 글자를 대문자로 올리면 된다.

**참고:** 영어에서 하이픈 사용이 모호한 단어들이 있다. 예를 들어 "nonempty"와 "non-empty"는 둘 다 맞으므로, 메서드 이름 `checkNonempty`와 `checkNonEmpty` 역시 둘 다 맞다.

---

# 세 언어 비교 요약

| 대상 | Java | Python | JavaScript |
|---|---|---|---|
| 패키지 | `deepspace` (전부 소문자, 붙여 씀) | `lower_with_under` | `exampleCode` (`lowerCamelCase`) |
| 모듈/파일 | — | `lower_with_under.py` (하이픈 금지) | — |
| 클래스·인터페이스 | `UpperCamelCase` | `CapWords` (약어는 전부 대문자: `HTTPServerError`) | `UpperCamelCase` |
| 열거형 | 규정된 별도 관례 없음(상수 멤버는 `UPPER_SNAKE_CASE`) | 클래스와 동일 `CapWords` | 타입 `UpperCamelCase`, 멤버 `CONSTANT_CASE` |
| 메서드·함수 | `lowerCamelCase` | `lower_with_under()` | `lowerCamelCase` (`@private`는 끝에 `_` 선택) |
| 상수 | `UPPER_SNAKE_CASE` | `CAPS_WITH_UNDER` | `CONSTANT_CASE` |
| 필드·인스턴스 변수 | `lowerCamelCase` | `lower_with_under` | `lowerCamelCase` (private은 `index_`) |
| 매개변수 | `lowerCamelCase` | `lower_with_under` | `lowerCamelCase` |
| 지역 변수 | `lowerCamelCase` | `lower_with_under` | `lowerCamelCase` |
| 타입/템플릿 매개변수 | `T`, `T2`, `RequestT` | `_T = TypeVar("_T")` | `TYPE`, `THIS` (전부 대문자) |
| 내부·비공개 표시 | 접두사·접미사 금지 | 밑줄 하나 접두사(`_name`) 권장, 던더(`__`)는 비권장 | 모듈 지역은 암묵적 private, `@private`는 끝에 `_` 선택 |
| 한 글자 이름 | public 메서드 매개변수에서 회피 | 카운터·`e`·`f` 등만 허용 | 스코프 10줄 이하면 허용 |
| 헝가리안 표기법 | 금지(`mName`, `s_name`, `kName`) | 타입을 이름에 넣지 않음(`id_to_name_dict`) | 금지(`kSecondsPerDay`) |
