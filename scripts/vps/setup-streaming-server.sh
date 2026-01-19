#!/usr/bin/env bash
#
# VPS Streaming Server Setup Script
# Ubuntu 22.04 LTS
#
# This script installs and configures:
# - FFmpeg with HLS support
# - Nginx with RTMP module
# - Node.js 20.x
# - PM2 process manager
#
# Usage: sudo bash setup-streaming-server.sh

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu 22.04" /etc/os-release; then
    log_warn "This script is designed for Ubuntu 22.04, your system may differ"
    read -rp "Continue anyway? (y/N) " -n 1
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log_info "Starting VPS Streaming Server setup..."

# Update system
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential tools
log_info "Installing essential tools..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install FFmpeg
log_info "Installing FFmpeg with HLS support..."
apt-get install -y \
    ffmpeg \
    libavcodec-extra \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev

# Verify FFmpeg installation
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    log_info "FFmpeg installed: ${FFMPEG_VERSION}"
else
    log_error "FFmpeg installation failed"
    exit 1
fi

# Install Nginx with RTMP module
log_info "Installing Nginx with RTMP module..."

# Install dependencies for building Nginx
apt-get install -y \
    libpcre3 \
    libpcre3-dev \
    libssl-dev \
    zlib1g-dev

# Download nginx-rtmp-module
NGINX_VERSION="1.24.0"
RTMP_MODULE_VERSION="1.2.2"

cd /tmp || exit 1

if [[ ! -d "nginx-${NGINX_VERSION}" ]]; then
    log_info "Downloading Nginx ${NGINX_VERSION}..."
    wget "http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz"
    tar -xzf "nginx-${NGINX_VERSION}.tar.gz"
fi

if [[ ! -d "nginx-rtmp-module-${RTMP_MODULE_VERSION}" ]]; then
    log_info "Downloading nginx-rtmp-module ${RTMP_MODULE_VERSION}..."
    wget "https://github.com/arut/nginx-rtmp-module/archive/v${RTMP_MODULE_VERSION}.tar.gz" -O rtmp-module.tar.gz
    tar -xzf rtmp-module.tar.gz
fi

# Build and install Nginx
cd "nginx-${NGINX_VERSION}" || exit 1

log_info "Configuring Nginx build..."
./configure \
    --prefix=/usr/local/nginx \
    --with-http_ssl_module \
    --with-http_v2_module \
    --with-http_realip_module \
    --with-http_addition_module \
    --with-http_sub_module \
    --with-http_dav_module \
    --with-http_flv_module \
    --with-http_mp4_module \
    --with-http_gunzip_module \
    --with-http_gzip_static_module \
    --with-http_random_index_module \
    --with-http_secure_link_module \
    --with-http_stub_status_module \
    --with-http_auth_request_module \
    --with-threads \
    --with-stream \
    --with-stream_ssl_module \
    --with-stream_realip_module \
    --add-module="../nginx-rtmp-module-${RTMP_MODULE_VERSION}"

log_info "Building Nginx (this may take a few minutes)..."
make -j"$(nproc)"

log_info "Installing Nginx..."
make install

# Create Nginx systemd service
log_info "Creating Nginx systemd service..."
cat > /etc/systemd/system/nginx.service <<'EOF'
[Unit]
Description=Nginx HTTP and RTMP Server
After=network.target

[Service]
Type=forking
PIDFile=/usr/local/nginx/logs/nginx.pid
ExecStartPre=/usr/local/nginx/sbin/nginx -t
ExecStart=/usr/local/nginx/sbin/nginx
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s QUIT $MAINPID
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Create Nginx directories
mkdir -p /usr/local/nginx/conf/sites-available
mkdir -p /usr/local/nginx/conf/sites-enabled
mkdir -p /var/www/hls
mkdir -p /var/www/dash
mkdir -p /var/log/nginx

# Set permissions
chown -R www-data:www-data /var/www/hls
chown -R www-data:www-data /var/www/dash
chown -R www-data:www-data /var/log/nginx

# Add nginx to PATH
if ! grep -q "/usr/local/nginx/sbin" /etc/environment; then
    sed -i 's|PATH="\(.*\)"|PATH="\1:/usr/local/nginx/sbin"|' /etc/environment
fi

log_info "Nginx with RTMP module installed successfully"

# Install Node.js 20.x
log_info "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_info "Node.js installed: ${NODE_VERSION}"
    log_info "npm installed: ${NPM_VERSION}"
else
    log_error "Node.js installation failed"
    exit 1
fi

# Install PM2
log_info "Installing PM2 globally..."
npm install -g pm2

# Verify PM2 installation
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    log_info "PM2 installed: ${PM2_VERSION}"
else
    log_error "PM2 installation failed"
    exit 1
fi

# Setup PM2 startup script
log_info "Configuring PM2 startup..."
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$SUDO_USER" --hp "/home/$SUDO_USER"

# Install yt-dlp (for YouTube archive downloads)
log_info "Installing yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

# Verify yt-dlp installation
if command -v yt-dlp &> /dev/null; then
    YTDLP_VERSION=$(yt-dlp --version)
    log_info "yt-dlp installed: ${YTDLP_VERSION}"
else
    log_warn "yt-dlp installation failed (optional)"
fi

# Configure firewall (UFW)
log_info "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw allow 1935/tcp  # RTMP
    ufw allow 8080/tcp  # HLS

    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        echo "y" | ufw enable
    fi

    log_info "Firewall configured"
else
    log_warn "UFW not found, skipping firewall configuration"
fi

# Create streaming directory structure
log_info "Creating streaming directory structure..."
mkdir -p /opt/streaming/{videos,playlists,logs}
chown -R "$SUDO_USER":"$SUDO_USER" /opt/streaming

# Reload systemd
systemctl daemon-reload

# Enable and start Nginx
log_info "Enabling and starting Nginx..."
systemctl enable nginx
systemctl start nginx

# Check Nginx status
if systemctl is-active --quiet nginx; then
    log_info "Nginx is running"
else
    log_warn "Nginx failed to start, check logs: journalctl -xe"
fi

# Summary
log_info "================================================"
log_info "VPS Streaming Server Setup Complete!"
log_info "================================================"
log_info ""
log_info "Installed components:"
log_info "  - FFmpeg: $(ffmpeg -version | head -n1 | awk '{print $3}')"
log_info "  - Nginx: ${NGINX_VERSION} (with RTMP module)"
log_info "  - Node.js: $(node --version)"
log_info "  - PM2: $(pm2 --version)"
log_info "  - yt-dlp: $(yt-dlp --version 2>/dev/null || echo 'not installed')"
log_info ""
log_info "Next steps:"
log_info "  1. Copy nginx-rtmp.conf to /usr/local/nginx/conf/"
log_info "  2. Restart Nginx: systemctl restart nginx"
log_info "  3. Deploy streaming scripts to /opt/streaming/"
log_info "  4. Configure PM2: pm2 start pm2-ecosystem.config.js"
log_info "  5. Save PM2 config: pm2 save"
log_info ""
log_info "Directories:"
log_info "  - HLS output: /var/www/hls"
log_info "  - DASH output: /var/www/dash"
log_info "  - Streaming files: /opt/streaming"
log_info ""
log_info "Ports opened:"
log_info "  - 22 (SSH), 80 (HTTP), 443 (HTTPS)"
log_info "  - 1935 (RTMP), 8080 (HLS)"
log_info ""
log_info "================================================"
