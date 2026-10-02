#!/bin/bash
# "사람이 들어왔나?" 에 답한다.
#
#   ssh ubuntu@<IP> 'cd /opt/namekata/app/deploy && ./stats.sh'
#
# 두 가지를 따로 센다. 섞으면 답이 흐려진다.
#
#   접속 로그  — 페이지가 열린 횟수. **대부분 봇이다.**
#                새 HTTPS 도메인은 인증서 투명성(CT) 로그를 통해 발급 즉시
#                전 세계에 공개되고, 스캐너가 바로 몰려온다. 게다가 요즘
#                크롤러는 진짜 브라우저 User-Agent 를 그대로 쓴다 — UA 로는
#                못 거른다.
#
#   제출 기록  — 사람이 빈칸에 이름을 쳐 넣고 제출한 것. 봇은 하지 않는다.
#                이쪽이 "쓰이고 있나"의 진짜 답이다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DC="docker compose -f $HERE/docker-compose.yml"

echo "══ 제출 (사람만 할 수 있는 일) ════════════════════════════"
$DC exec -T db psql -qAU namekata -d namekata <<'SQL'
select
    count(*)                                          as 전체,
    count(*) filter (where created_at > now() - interval '24 hours') as 최근24시간,
    count(*) filter (where created_at > now() - interval '7 days')   as 최근7일,
    count(*) filter (where exact)                     as 정확히_맞음,
    count(distinct question_id)                       as 풀린_문제수
from submissions;
SQL

echo
echo "══ 최근 제출 10건 ═════════════════════════════════════════"
$DC exec -T db psql -qAU namekata -d namekata <<'SQL'
select s.created_at::timestamp(0) as 시각, s.name as 제출, q.answer as 원본,
       case when s.exact then '정확' when s.partial then '단어겹침' else '틀림' end as 결과
from submissions s join questions q on q.id = s.question_id
order by s.created_at desc limit 10;
SQL

echo
echo "══ 접속 로그 (참고용 — 대부분 봇이다) ══════════════════════"
$DC logs caddy 2>/dev/null | grep "handled request" | python3 -c '
import sys, json, collections
ips, paths, days = collections.Counter(), collections.Counter(), collections.Counter()
total = 0
for line in sys.stdin:
    i = line.find("{")
    if i < 0:
        continue
    try:
        d = json.loads(line[i:])
    except Exception:
        continue
    r = d.get("request", {})
    uri = r.get("uri", "")
    if uri.startswith("/_next") or uri.endswith((".svg", ".ico", ".css", ".js")):
        continue          # 부속 파일은 사람 수와 무관하다
    total += 1
    ips[r.get("client_ip", "?")] += 1
    paths[uri.split("?")[0][:46]] += 1

print(f"  페이지 요청 {total}건 · 서로 다른 IP {len(ips)}개")
print()
print("  많이 열린 페이지:")
for p, c in paths.most_common(8):
    print(f"    {c:5}  {p}")
print()
print("  한 IP 가 몇 번씩 왔나 (한 IP 가 수십 번이면 크롤러다):")
for ip, c in ips.most_common(5):
    print(f"    {c:5}  {ip}")
' || echo "  (로그 없음)"

echo
echo "─────────────────────────────────────────────────────────────"
echo "판단 기준: 접속 수가 아니라 **제출 수**를 본다."
echo "제출이 꾸준히 늘면 쓰이는 것이고, 0 이면 아무도 안 쓰는 것이다."
