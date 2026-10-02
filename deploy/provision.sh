#!/bin/sh
# 새 Ubuntu 박스를 배포 가능한 상태로 만든다. 한 번만 돌리면 된다.
#
#   scp -i ~/.ssh/namekata.pem deploy/provision.sh ubuntu@<IP>:/tmp/
#   ssh -i ~/.ssh/namekata.pem ubuntu@<IP> 'sudo sh /tmp/provision.sh'
#
# 왜 Lightsail 의 user-data(시작 스크립트)로 넣지 않는가:
#
#   Lightsail 은 user-data 앞에 자기 초기화 코드를 붙여 하나의 파일로 만들고
#   그것을 /bin/sh (우분투에서는 dash) 로 실행한다. 이 과정에서 셰방이
#   무력화되므로 bash 전용 문법을 쓰면 죽는다 — `set -o pipefail` 이 그렇다.
#   그래서 이 파일은 POSIX sh 로만 쓰여 있고, user-data 로도 쓸 수 있다.
#
# 여러 번 돌려도 안전하다 (이미 된 것은 건너뛴다).
set -eu

REPO="${REPO:-https://github.com/junyoung4949/namekata.git}"
APP_DIR=/opt/namekata

echo "== 스왑 =="
# 2GB 램에서 Gradle·Next 빌드가 돌아야 한다. Lightsail 인스턴스에는 스왑이
# 없어서 빌드 중 OOM 으로 죽는다.
if [ ! -f /swapfile ]; then
	fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
	chmod 600 /swapfile
	mkswap /swapfile
	swapon /swapfile
	grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
	# 램이 남아 있는데 스왑으로 밀어내지 않게 한다. 빌드 때만 쓰이면 된다.
	echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
	sysctl -w vm.swappiness=10 > /dev/null
	echo "  2GB 추가"
else
	echo "  이미 있음"
fi

echo "== 기본 패키지 =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git > /dev/null

echo "== Docker =="
# 우분투 기본 저장소에는 compose v2 플러그인이 없어서 공식 저장소를 쓴다.
if ! command -v docker > /dev/null 2>&1; then
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	ARCH="$(dpkg --print-architecture)"
	CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
	echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $CODENAME stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null
	echo "  설치: $(docker --version)"
else
	echo "  이미 있음: $(docker --version)"
fi
usermod -aG docker ubuntu

echo "== 레포 =="
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/app/.git" ]; then
	git -C "$APP_DIR/app" pull --ff-only
else
	git clone --depth 50 "$REPO" "$APP_DIR/app"
fi
mkdir -p "$APP_DIR/backups"
chown -R ubuntu:ubuntu "$APP_DIR"

echo "== 매일 백업 =="
# 새벽 4시(KST 13시 아님 — 서버는 UTC). UTC 19시 = KST 4시.
CRON="0 19 * * * cd $APP_DIR/app/deploy && ./backup.sh >> $APP_DIR/backups/backup.log 2>&1"
( crontab -u ubuntu -l 2>/dev/null | grep -v 'deploy/backup.sh' ; echo "$CRON" ) | crontab -u ubuntu -
echo "  등록"

echo
echo "준비 끝. 다음:"
echo "  cd $APP_DIR/app/deploy"
echo "  cp .env.example .env && nano .env     # DB_PASSWORD·ADMIN_TOKEN 채우기"
echo "  ./deploy.sh"
