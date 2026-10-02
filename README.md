# namekata

오픈소스 코드에서 이름 하나만 가리고, 직접 이름을 지어본 뒤 원작자가 붙인 이름과 다른 사람들의 답을 비교하는
네이밍 연습 사이트.

한 저장소에 세 덩어리가 들어 있다.

| 디렉터리 | 무엇 | 하는 일 |
| --- | --- | --- |
| `tools/extract/` | Python · tree-sitter | GitHub에서 코드를 커밋 해시로 고정해 받아와 식별자 하나를 가린 문제를 만든다 |
| `server/` | Java 21 · Spring Boot 4 · Postgres | 문제 저장·채점·난이도·검수 API. 문제의 원본은 DB다 |
| `web/` | TypeScript · Next.js 16 | 풀이·검수 화면. 서버만 바라본다 |
| `.github/workflows/` | GitHub Actions | 추출기를 돌려 결과를 서버로 보낸다 |

한 저장소에 둔 이유는 셋이 **같은 커밋에서 함께 바뀌기** 때문이다. 웹의 타입은 서버의 레코드를 보고 있고,
추출기의 출력 모양은 서버의 import API 가 받는 모양이며, 워크플로 하나가 `tools/` 를 돌려 `server/` 를 때린다.
따로 릴리스되지 않으므로 쪼개서 얻을 것이 없다.

설계 메모는 [네이밍 연습 사이트 설계.md](./네이밍%20연습%20사이트%20설계.md)에 있다.

## 띄우기

Postgres 와 서버가 필요하다. 웹만 따로 띄우는 길은 없다 (아래 "한 곳에서만" 참고).

```bash
# 1) DB
createdb namekata          # 스키마는 서버가 뜰 때 Flyway 가 만든다

# 2) 서버 — http://localhost:8080
cd server
NAMEKATA_ADMIN_TOKEN=secret123 ./gradlew bootRun

# 3) 웹 — http://localhost:3000
cd web
npm install
NAMEKATA_API_URL=http://localhost:8080 NAMEKATA_ADMIN_TOKEN=secret123 npm run dev
```

DB가 비어 있으면 문제가 없다. 채우는 방법은 둘이다.

```bash
# (a) GitHub Actions — Actions 탭 → "문제 추출" → Run workflow
#     NAMEKATA_API_URL 과 NAMEKATA_ADMIN_TOKEN 시크릿이 필요하다.

# (b) 로컬에서 직접 (네트워크 필요, 한국에서 2~3분)
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 이미 들어 있는 문제가 쓰던 커밋을 받아 와서 고정한다. 최신 커밋으로 옮겨가면
# 줄 번호가 밀려 문제 id 가 통째로 바뀌고, 쌓인 제출·검수 기록이 갈 곳을 잃는다.
curl -s -H "x-admin-token: secret123" localhost:8080/admin/questions/pins > /tmp/pins.json
.venv/bin/python tools/extract/extract.py --pin-from /tmp/pins.json --out /tmp/q.json
curl -X POST localhost:8080/admin/questions/import \
  -H "x-admin-token: secret123" -H 'Content-Type: application/json' --data-binary @/tmp/q.json
```

추출 직후 모든 문제는 `pending` 이다. 개발에서는 그대로 풀리고, 운영에서는 `NAMEKATA_ALLOW_PENDING=0` 으로
두어 `/admin` 에서 승인한 것만 내보낸다. 환경 변수는 `web/.env.example` 과 `server/src/main/resources/application.yml` 참고.

## 테스트

```bash
.venv/bin/python -m pytest tools/extract -q   # 추출기 — 가리기가 새지 않는지
cd server && ./gradlew test                   # 서버 — 채점·난이도·import 불변식 (namekata_test DB 필요)
cd web && npx tsc --noEmit && npx eslint src  # 웹
```

## 한 곳에서만

같은 규칙이 두 언어에 있으면 한쪽만 고쳐졌을 때 조용히 어긋난다. 그래서 규칙마다 주인을 하나로 정했다.

| 규칙 | 주인 | 메모 |
| --- | --- | --- |
| 이름을 단어로 쪼개기 (채점) | `server` 의 `naming.Identifier` | 제출은 실행 중에 들어오므로 여기서 쪼갤 수밖에 없다 |
| 난이도 경계 | `server` 의 `naming.LevelPolicy` | 추출기의 추정값으로 시작해 표본이 쌓이면 실측으로 덮는다 |
| 문제를 고르고 가리기 | `tools/extract` | 어느 후보를 문제로 쓸지, 무엇을 가릴지 |
| 스키마 | `server/src/main/resources/db/migration` | Flyway 가 소유하고 JPA 는 검증만 한다 (`ddl-auto: validate`) |
| 칸마다 주인 | `V1__baseline.sql` 의 주석 | 추출기가 덮는 칸과 사람이 채우는 칸을 나눠 두었다 |

추출기에도 단어를 쪼개는 코드가 있지만(`split_words`) 채점과 **맞출 필요가 없다.** 그쪽은 누출 변형을 만들고
난이도를 가늠하는 내부 어림짐작이라, 어긋나도 채점은 정답과 제출을 같은 자로 재므로 결과가 틀리지 않는다.
대신 서버가 import 때 "답이 코드에 보이는가"를 자기 구현으로 한 번 더 확인한다 (`naming.AnswerLeak`) —
같은 성질을 서로 다른 구현으로 보는 것이라서, 추출기가 놓친 누출이 검수자의 눈에만 의존하지 않는다.

## 지금 되는 것

- Java·Python·JavaScript 의 **메서드 이름과 변수 이름** 가리기, 언어·난이도 필터
- 코드 + 출처 보기 → 코드 안 빈칸에 직접 입력 → 원본 공개 + 단어 단위 일치 표시 + 다른 사람들의 답 목록
- 코드 위에 에디터 탭처럼 파일 이름과 감싸는 클래스를 붙인다 (어느 클래스의 메서드인지는 이름을 짓기 전에 알아야 한다)
- 언어마다 그 언어를 쓰는 에디터의 배색으로 문법 강조 — Java는 IntelliJ(Darcula / IntelliJ Light), Python·JS는
  VS Code 기본 테마(Dark+ / Light+). 배정은 `web/src/lib/highlight.ts` 의 `THEMES`, 토큰화는 서버에서만 한다
- 줄 번호, 들여쓰기 가이드, 괄호 쌍 색칠. 셋 다 코드를 해석하지 않고 글자만 보면 되는 것들이다
- 주석 보기는 열 때만 내려오고, 원본 주석을 코드 안 원래 있던 자리에 되살린다 (주석 안의 이름은 가린 채로)
- 답 신고 → 검수 화면에서 숨기기
- 한국어·영어 UI, 라이선스 페이지, 삭제 요청 창구
- 관리자 검수 화면 (승인/거부, 저작권자 직접 입력)

## 아직 아닌 것

- 답 투표·순위 (사용자가 모여야 의미가 있음)
- 클래스 이름 문제 (스키마와 추출기에 `class` 자리는 있고 아직 안 켰다)
- 계정별 기록, 유료 기능, LLM 채점

## 남은 숙제

- 삭제 요청 연락처가 `example.invalid` 자리표시자다. 배포 전에 `NEXT_PUBLIC_TAKEDOWN_CONTACT` 를 채울 것
- 배포처 미정. 서버는 Postgres 가 붙는 곳, 웹은 Vercel 에 `Root Directory = web` 으로 올리면 된다
- 변수 문제가 같은 파일의 메서드 문제 답을 보여주는 경우가 있다 (의도적으로 막지 않음 — 어떤 이름이 쓰이는지
  귀납하는 것도 연습이라고 보았다). 그 메서드 문제들의 측정 난이도는 실제보다 쉽게 나온다
- 제출 전에 출처 링크로 원본을 먼저 보는 경우를 막을지 미정. 지금은 확인 창만 띄우고 통과시킨다
- 사용자가 없는 초기에 "다른 사람들이 낸 답"을 무엇으로 채울지 미정
- 유료화 전에 라이선스 전문가 확인 한 번
