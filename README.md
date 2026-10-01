# namekata

오픈소스 코드에서 이름만 가리고, 직접 이름을 지어본 뒤 원작자가 붙인 이름과 다른 사람들의 답을 비교하는 네이밍 연습 사이트.

설계는 [네이밍 연습 사이트 설계.md](./네이밍%20연습%20사이트%20설계.md)에 있다.

## 구성

| 디렉터리 | 하는 일 |
| --- | --- |
| `tools/extract/` | GitHub에서 코드를 커밋 해시로 고정해 받아와 tree-sitter로 문제를 만든다 (파이프라인 1~4단계) |
| `data/questions.json` | 추출기 산출물. 문제 본문·원본 이름·감싸는 클래스·출처·라이선스 |
| `web/` | Next.js 앱. 풀이·채점·다른 사용자 답·검수 화면 |
| `supabase/schema.sql` | 제출 답 저장용 테이블 |

## 실행

```bash
# 1) 문제 만들기 (네트워크 필요, 2~3분)
python3 -m venv .venv
.venv/bin/pip install tree-sitter tree-sitter-java tree-sitter-python tree-sitter-javascript
.venv/bin/python tools/extract/extract.py --out data/questions.json

# 1-1) 필터를 고쳐서 다시 뽑을 때는 커밋을 고정한다.
# 최신 커밋으로 옮겨가면 줄 번호가 밀려 문제 id가 통째로 바뀌고,
# 쌓인 제출·검수 기록이 어느 문제 것인지 알 수 없게 된다.
.venv/bin/python tools/extract/extract.py --pin-from data/questions.json --out data/questions.json

# 2) 웹 앱
cd web
npm install
npm run dev     # http://localhost:3000
```

개발 중에는 검수 전 문제도 바로 풀 수 있다. 운영에서는 `NAMEKATA_ALLOW_PENDING=0`을 두고
`/admin`에서 승인한 문제만 내보낸다. 환경 변수는 `web/.env.example` 참고.

## 저장소

Supabase 환경 변수가 없으면 `data/local-store.json` 파일 한 개에 제출을 쌓는다 (개발용).
`NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`를 넣으면 `supabase/schema.sql`의
테이블을 쓴다. 코드 변경은 필요 없다.

## 지금 되는 것

- Java·Python·JavaScript 메서드 이름 가리기, 언어 필터
- 코드 + 출처 보기 → 코드 안 빈칸에 직접 이름 입력 → 원본 공개 + 단어 단위 일치 표시 + 다른 사람들의 답 목록
- 코드 위에 에디터 탭처럼 파일 이름과 감싸는 클래스를 붙인다 (어느 클래스의 메서드인지는 이름을 짓기 전에 알아야 한다)
- 언어마다 그 언어를 쓰는 에디터의 배색으로 문법 강조 — Java는 IntelliJ(Darcula / IntelliJ Light, `web/src/lib/themes/intellij.ts`에 직접 정의), Python·JS는 VS Code 기본 테마(Dark+ / Light+). 어느 언어에 무엇을 쓸지는 `web/src/lib/highlight.ts`의 `THEMES`에 있고, 토큰화는 서버에서만 한다
- 줄 번호, 들여쓰기 가이드, 괄호 쌍 색칠. 셋 다 코드를 해석하지 않고 글자만 보면 되는 것들이다. 들여쓰기 한 단계 너비는 코드에서 알아내고(탭·2칸·4칸 모두), 문자열 안의 괄호는 색칠에서 뺀다
- 주석 보기는 열 때만 내려오고, 원본 주석을 코드 안 원래 있던 자리에 되살린다 (주석 안의 이름은 가린 채로)
- 답 신고 → 검수 화면에서 숨기기
- 한국어·영어 UI, 라이선스 페이지, 삭제 요청 창구
- 관리자 검수 화면 (승인/거부)

## 아직 아닌 것

- 답 투표·순위 (사용자가 모여야 의미가 있음)
- 변수·클래스 문제 (추출기는 "식별자 하나와 그 등장 위치를 가린다"는 구조라 확장 지점은 `extract_targets`)
- 계정별 기록, 유료 기능, LLM 채점

## 남은 숙제

- 삭제 요청 연락처가 `example.invalid` 자리표시자다. 배포 전에 `NEXT_PUBLIC_TAKEDOWN_CONTACT`를 채울 것
- 제출 전에 출처 링크로 원본을 먼저 보는 경우를 막을지 미정. 지금은 확인 창만 띄우고 통과시킨다
- 사용자가 없는 초기에 "다른 사람들이 낸 답"을 무엇으로 채울지 미정
- 유료화 전에 라이선스 전문가 확인 한 번
