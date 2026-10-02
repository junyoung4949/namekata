#!/bin/bash
# 배포. 인스턴스 안에서 돌린다.
#
#   cd /opt/namekata/app/deploy && ./deploy.sh
#
# 2GB 램에서 빌드가 돌아야 해서 순서가 중요하다. 넷을 동시에 빌드하면
# 스왑까지 먹고 느려지거나 죽는다. 하나씩 세운다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if [ ! -f .env ]; then
	echo ".env 가 없다. .env.example 을 보고 만들어야 한다." >&2
	exit 1
fi

echo "== 코드 받기 =="
git -C .. pull --ff-only

echo "== 빌드 (한 번에 하나씩 — 2GB 램) =="
docker compose build server
docker compose build web

echo "== 올리기 =="
docker compose up -d db
docker compose up -d server
docker compose up -d web caddy

echo "== 상태 =="
docker compose ps

# 쓰지 않는 이미지는 지운다. 60GB 디스크가 빌드 찌꺼기로 차는 것을 막는다.
docker image prune -f > /dev/null

echo
echo "서버가 뜨는 데 1분쯤 걸린다. 확인:"
echo "  docker compose logs -f server"
echo "  curl -s localhost/ko | head -5"
