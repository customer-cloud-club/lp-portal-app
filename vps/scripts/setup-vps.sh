#!/bin/bash

# SkillFreak Streaming System - VPS Initial Setup Script
# VPS初期セットアップ自動化スクリプト

set -e  # エラー時に停止

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Root権限チェック
if [ "$EUID" -ne 0 ]; then
    error "このスクリプトはroot権限で実行してください: sudo $0"
fi

log "SkillFreak Streaming System VPS Setup"
log "======================================"

# 1. システムアップデート
log "1. システムアップデート中..."
apt update && apt upgrade -y || error "システムアップデートに失敗しました"

# 2. 必要なパッケージインストール
log "2. 必要なパッケージをインストール中..."
apt install -y \
    nginx \
    ffmpeg \
    python3-pip \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw \
    curl \
    git \
    htop || error "パッケージインストールに失敗しました"

# 3. rcloneインストール
log "3. rcloneをインストール中..."
if ! command -v rclone &> /dev/null; then
    curl https://rclone.org/install.sh | bash || error "rcloneインストールに失敗しました"
else
    log "rcloneは既にインストールされています"
fi

# 4. ファイアウォール設定
log "4. ファイアウォールを設定中..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable || warn "UFW設定に失敗しました"

# 5. ユーザー作成
log "5. streamuserを作成中..."
if ! id -u streamuser &>/dev/null; then
    useradd -m -s /bin/bash streamuser
    usermod -aG sudo streamuser
    log "streamuserを作成しました"
else
    log "streamuserは既に存在します"
fi

# 6. ディレクトリ作成
log "6. ディレクトリ構造を作成中..."
mkdir -p /opt/skillfreak-stream/{config,scripts,playlists,stream/segments,logs}
chown -R streamuser:streamuser /opt/skillfreak-stream

# 7. 設定ファイルのコピー
log "7. 設定ファイルをコピー中..."
if [ -f "vps/scripts/stream-manager.sh" ]; then
    cp vps/scripts/stream-manager.sh /opt/skillfreak-stream/scripts/
    chmod +x /opt/skillfreak-stream/scripts/stream-manager.sh
fi

if [ -f "vps/config/nginx-stream.conf" ]; then
    cp vps/config/nginx-stream.conf /etc/nginx/sites-available/skillfreak-stream
    ln -sf /etc/nginx/sites-available/skillfreak-stream /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
fi

# 8. systemdサービス登録
log "8. systemdサービスを登録中..."
cat > /etc/systemd/system/skillfreak-stream.service << 'EOF'
[Unit]
Description=SkillFreak 24/7 Streaming Service
After=network.target

[Service]
Type=simple
User=streamuser
WorkingDirectory=/opt/skillfreak-stream
ExecStart=/opt/skillfreak-stream/scripts/stream-manager.sh start
Restart=always
RestartSec=10
StandardOutput=append:/opt/skillfreak-stream/logs/service.log
StandardError=append:/opt/skillfreak-stream/logs/service-error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable skillfreak-stream
log "systemdサービスを登録しました"

# 9. fail2ban設定
log "9. fail2banを設定中..."
cat > /etc/fail2ban/jail.local << 'EOF'
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 60
bantime = 3600
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 10. rclone設定案内
log "10. rclone設定"
warn "次のコマンドでrcloneを設定してください:"
echo "   sudo -u streamuser rclone config"
echo ""
echo "Backblaze B2の設定:"
echo "   - Storage: Backblaze B2"
echo "   - Account ID: [B2 Key ID]"
echo "   - Application Key: [B2 Application Key]"
echo "   - Remote name: b2"

# 完了
log "======================================"
log "VPSセットアップが完了しました！"
log ""
log "次のステップ:"
log "1. rclone設定: sudo -u streamuser rclone config"
log "2. 環境変数設定: /opt/skillfreak-stream/.env"
log "3. 配信開始: sudo systemctl start skillfreak-stream"
log "4. SSL証明書取得: sudo certbot --nginx -d stream.skillfreak.com"
log ""
log "ステータス確認: /opt/skillfreak-stream/scripts/stream-manager.sh status"
