#!/bin/bash
# 박스 밖으로 데이터를 뺀다. cron 으로 매일 돌린다.
#
# 왜 필요한가: DB 에 있는 것 중 다시 만들 수 없는 게 있다.
#
#   questions 본문·코드·출처   추출 워크플로를 한 번 돌리면 복구된다
#   questions.status           사람이 검수한 결과 — 다시 할 수 없다
#   copyright_holder_override  사람이 채운 값
#   submissions                이 사이트의 존재 이유
#   reports · hidden_answers   사람이 판단한 것
#
# 전부 합쳐도 1MB 미만이다. 작으니 매일 통째로 뜬다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${BACKUP_DIR:-/opt/namekata/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"

# --clean --if-exists: 복원할 때 기존 객체를 지우고 다시 만든다.
docker compose -f "$HERE/docker-compose.yml" exec -T db \
	pg_dump -U namekata -d namekata --clean --if-exists \
	| gzip -9 > "$OUT/namekata-$STAMP.sql.gz"

# 비었으면 실패로 친다. 조용히 0바이트 백업이 쌓이는 것이 제일 나쁘다.
SIZE=$(stat -c%s "$OUT/namekata-$STAMP.sql.gz" 2>/dev/null || stat -f%z "$OUT/namekata-$STAMP.sql.gz")
if [ "$SIZE" -lt 1000 ]; then
	echo "백업이 너무 작다 (${SIZE}바이트). 실패로 처리한다." >&2
	rm -f "$OUT/namekata-$STAMP.sql.gz"
	exit 1
fi

find "$OUT" -name 'namekata-*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "백업 완료: $OUT/namekata-$STAMP.sql.gz ($((SIZE / 1024))KB)"

# 같은 박스 안에만 두면 박스가 죽을 때 같이 죽는다. Lightsail 자동 스냅샷이
# 인스턴스를 통째로 뜨므로 1차 방어는 되지만, 그것도 같은 계정 안이다.
#
# 더 멀리 두려면 여기에 한 줄 더한다 (버킷을 만든 뒤):
#   aws s3 cp "$OUT/namekata-$STAMP.sql.gz" s3://<버킷>/namekata/
