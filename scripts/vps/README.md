# VPS Streaming Server Setup Guide

Complete guide for setting up a 24-hour VOD streaming server on VPS (Virtual Private Server).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Recommended VPS Providers](#recommended-vps-providers)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)
- [Security](#security)

## Overview

This setup creates a complete streaming infrastructure:

- **FFmpeg**: Video processing and HLS conversion
- **Nginx + RTMP**: RTMP server and HLS delivery
- **Node.js + PM2**: Process management and automation
- **yt-dlp**: YouTube archive downloads

### System Architecture

```
┌──────────────────┐
│  Video Sources   │
│  (Lark Drive,    │
│   YouTube)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  FFmpeg Stream   │
│  (HLS Conversion)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Nginx + RTMP    │
│  (Port 1935)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  HLS Delivery    │
│  (Port 8080)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Viewers         │
│  (Web, Mobile)   │
└──────────────────┘
```

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS (recommended)
- **CPU**: 2+ cores (4+ for HD streaming)
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 50GB+ (depending on video library)
- **Network**: 100Mbps+ upload bandwidth

### Software Requirements

- Root or sudo access
- SSH access to VPS
- Domain name (optional, for HTTPS)

## Recommended VPS Providers

### 1. Vultr (Recommended)

**Pros:**
- High-performance CPUs
- Global CDN locations
- Excellent network bandwidth
- Easy scaling

**Recommended Plan:**
- **High Frequency**: $24/month
  - 2 vCPU
  - 4GB RAM
  - 128GB SSD
  - 3TB bandwidth

**Deployment:**
```bash
# Vultr Tokyo region recommended for Japan/Asia
Region: Tokyo (NRT)
OS: Ubuntu 22.04 LTS
```

### 2. DigitalOcean

**Pros:**
- Simple interface
- Good documentation
- Predictable pricing

**Recommended Plan:**
- **Basic Droplet**: $24/month
  - 2 vCPU
  - 4GB RAM
  - 80GB SSD
  - 4TB bandwidth

**Deployment:**
```bash
# Singapore region for Asia-Pacific
Region: Singapore (SGP1)
OS: Ubuntu 22.04 LTS
```

### 3. Linode (Akamai)

**Pros:**
- Excellent network (Akamai CDN)
- Competitive pricing
- Good support

**Recommended Plan:**
- **Dedicated 4GB**: $36/month
  - 2 dedicated vCPU
  - 4GB RAM
  - 80GB SSD
  - 4TB bandwidth

### 4. AWS Lightsail (For AWS users)

**Pros:**
- Integrated with AWS ecosystem
- Predictable pricing

**Recommended Plan:**
- **$20/month**
  - 2 vCPU
  - 4GB RAM
  - 80GB SSD
  - 4TB bandwidth

## Quick Start

### 1. Provision VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y
```

### 2. Run Setup Script

```bash
# Download setup script
wget https://raw.githubusercontent.com/IvyGain/skillfreak-streaming-system/main/scripts/vps/setup-streaming-server.sh

# Make executable
chmod +x setup-streaming-server.sh

# Run setup (this takes 10-15 minutes)
sudo bash setup-streaming-server.sh
```

### 3. Configure Nginx

```bash
# Copy RTMP configuration
wget https://raw.githubusercontent.com/IvyGain/skillfreak-streaming-system/main/scripts/vps/nginx-rtmp.conf -O /usr/local/nginx/conf/nginx.conf

# Test configuration
/usr/local/nginx/sbin/nginx -t

# Restart Nginx
systemctl restart nginx
```

### 4. Deploy Streaming Script

```bash
# Create streaming directory
mkdir -p /opt/streaming/{videos,scripts,logs}

# Download streaming script
wget https://raw.githubusercontent.com/IvyGain/skillfreak-streaming-system/main/scripts/vps/ffmpeg-stream.sh -O /opt/streaming/scripts/ffmpeg-stream.sh

chmod +x /opt/streaming/scripts/ffmpeg-stream.sh

# Download PM2 config
wget https://raw.githubusercontent.com/IvyGain/skillfreak-streaming-system/main/scripts/vps/pm2-ecosystem.config.js -O /opt/streaming/pm2-ecosystem.config.js
```

### 5. Upload Videos

```bash
# Option A: Upload via SCP
scp /path/to/video.mp4 root@your-vps-ip:/opt/streaming/videos/

# Option B: Download from YouTube
cd /opt/streaming/videos
yt-dlp -f 'bestvideo[height<=720]+bestaudio/best[height<=720]' "https://youtube.com/watch?v=VIDEO_ID"

# Option C: Sync from Lark Drive (requires Lark API setup)
# See: ../youtube-to-lark-drive.ts
```

### 6. Start Streaming

```bash
# Start with PM2
cd /opt/streaming
pm2 start pm2-ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs skillfreak-streaming
```

### 7. Access Stream

```bash
# HLS stream URL
http://your-vps-ip:8080/hls/skillfreak.m3u8

# Test with VLC or ffplay
ffplay http://your-vps-ip:8080/hls/skillfreak.m3u8
```

## Detailed Setup

### Firewall Configuration

```bash
# UFW (Ubuntu Firewall)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (for future HTTPS setup)
ufw allow 1935/tcp  # RTMP
ufw allow 8080/tcp  # HLS delivery

# Enable firewall
ufw enable

# Check status
ufw status verbose
```

### SSL/TLS Setup (Optional but Recommended)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain certificate (requires domain)
certbot certonly --standalone -d streaming.yourdomain.com

# Configure Nginx for HTTPS
# Edit /usr/local/nginx/conf/nginx.conf
# Add SSL configuration (see below)

# Auto-renewal
certbot renew --dry-run
```

### HTTPS Nginx Configuration

```nginx
# Add to http block in nginx.conf
server {
    listen 443 ssl http2;
    server_name streaming.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/streaming.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/streaming.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /hls {
        alias /var/www/hls;
        add_header Access-Control-Allow-Origin * always;
        add_header Cache-Control "public, max-age=3" always;

        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }
}

# HTTP redirect
server {
    listen 80;
    server_name streaming.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Configuration

### Environment Variables

Create `/opt/streaming/.env`:

```bash
# Streaming configuration
STREAM_NAME=skillfreak
RTMP_URL=rtmp://localhost/live/skillfreak
VIDEO_FOLDER=/opt/streaming/videos

# Lark API (optional)
LARK_APP_ID=cli_xxxxx
LARK_APP_SECRET=xxxxx
LARK_DRIVE_FOLDER_ID=xxxxx

# Discord webhook (optional, for alerts)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx

# AWS S3 (optional, for backup)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_BUCKET_NAME=skillfreak-streaming-backup
```

### FFmpeg Stream Options

Edit `/opt/streaming/pm2-ecosystem.config.js`:

```javascript
{
  name: 'skillfreak-streaming',
  script: '/opt/streaming/scripts/ffmpeg-stream.sh',
  args: '/opt/streaming/videos rtmp://localhost/live/skillfreak --loop 0 --shuffle --bitrate 3000k',
  // ... other options
}
```

**Available options:**
- `--loop N`: Loop count (0 = infinite)
- `--shuffle`: Randomize video order
- `--preset fast|medium|slow`: Encoding quality
- `--bitrate 2000k`: Video bitrate

## Usage

### PM2 Commands

```bash
# Start all processes
pm2 start pm2-ecosystem.config.js

# Start specific process
pm2 start skillfreak-streaming

# Stop process
pm2 stop skillfreak-streaming

# Restart process
pm2 restart skillfreak-streaming

# Delete process
pm2 delete skillfreak-streaming

# View logs
pm2 logs skillfreak-streaming

# Real-time monitoring
pm2 monit

# List all processes
pm2 list

# Save current state
pm2 save

# Restore saved state
pm2 resurrect
```

### Manual Streaming

```bash
# Run FFmpeg stream manually
cd /opt/streaming/scripts
./ffmpeg-stream.sh /opt/streaming/videos rtmp://localhost/live/skillfreak

# With options
./ffmpeg-stream.sh /opt/streaming/videos rtmp://localhost/live/skillfreak --shuffle --bitrate 3000k --loop 5
```

### Video Management

```bash
# List videos
ls -lh /opt/streaming/videos

# Add new video
cd /opt/streaming/videos
yt-dlp "https://youtube.com/watch?v=VIDEO_ID"

# Remove old videos
rm /opt/streaming/videos/old-video.mp4

# Check disk space
df -h /opt/streaming
```

## Troubleshooting

### Stream Not Starting

```bash
# Check FFmpeg process
pm2 logs skillfreak-streaming

# Check Nginx
systemctl status nginx
/usr/local/nginx/sbin/nginx -t

# Check RTMP stat
curl http://localhost:8080/stat

# Check firewall
ufw status
```

### High CPU Usage

```bash
# Check processes
top
htop

# Reduce bitrate in PM2 config
# Change --bitrate 2000k to --bitrate 1500k

# Use faster preset
# Change --preset fast to --preset ultrafast

# Restart stream
pm2 restart skillfreak-streaming
```

### Stream Buffering

```bash
# Check network bandwidth
speedtest-cli

# Check HLS segment files
ls -lh /var/www/hls

# Reduce bitrate
# Edit pm2-ecosystem.config.js

# Check nginx error log
tail -f /var/log/nginx/error.log
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean old HLS segments
find /var/www/hls -name "*.ts" -mtime +1 -delete

# Clean old logs
find /opt/streaming/logs -name "*.log" -mtime +7 -delete

# Archive old videos to S3
aws s3 sync /opt/streaming/videos s3://your-bucket/videos/
```

## Monitoring

### Nginx RTMP Statistics

```bash
# Access stats page
curl http://localhost:8080/stat

# Or open in browser
firefox http://your-vps-ip:8080/stat
```

### PM2 Monitoring

```bash
# Web dashboard
pm2 web

# Install PM2 Plus (optional, paid service)
pm2 link [secret] [public]
```

### Health Checks

```bash
# Check if stream is live
curl -I http://your-vps-ip:8080/hls/skillfreak.m3u8

# Check Nginx health
curl http://your-vps-ip:8080/health

# Check server resources
htop
vmstat 1
iostat -x 1
```

### Log Files

```bash
# Streaming logs
tail -f /opt/streaming/logs/streaming-out.log
tail -f /opt/streaming/logs/streaming-error.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -xe
journalctl -u nginx -f
```

## Security

### Secure RTMP Publishing

Edit `/usr/local/nginx/conf/nginx.conf`:

```nginx
application live {
    live on;

    # Only allow publishing from localhost
    allow publish 127.0.0.1;
    deny publish all;

    # Allow playback from anywhere
    allow play all;
}
```

### IP Whitelist (Optional)

```nginx
location /hls {
    # Allow specific IPs
    allow 1.2.3.4;
    allow 5.6.7.0/24;
    deny all;

    alias /var/www/hls;
}
```

### Fail2Ban (Prevent DDoS)

```bash
# Install fail2ban
apt install fail2ban -y

# Configure for Nginx
cat > /etc/fail2ban/jail.local << EOF
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 600
EOF

# Restart fail2ban
systemctl restart fail2ban

# Check status
fail2ban-client status
```

### Regular Updates

```bash
# Update system packages
apt update && apt upgrade -y

# Update yt-dlp
yt-dlp -U

# Update Node.js packages
npm update -g
```

## Backup Strategy

```bash
# Backup configuration
tar -czf /backup/streaming-config-$(date +%F).tar.gz /usr/local/nginx/conf /opt/streaming/pm2-ecosystem.config.js

# Backup videos to S3
aws s3 sync /opt/streaming/videos s3://your-bucket/videos/ --storage-class STANDARD_IA

# Automated backup script (cron)
cat > /opt/streaming/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/backup
DATE=$(date +%F)
tar -czf $BACKUP_DIR/config-$DATE.tar.gz /usr/local/nginx/conf /opt/streaming
aws s3 cp $BACKUP_DIR/config-$DATE.tar.gz s3://your-bucket/backups/
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x /opt/streaming/scripts/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/streaming/scripts/backup.sh
```

## Performance Tuning

### Nginx Worker Processes

```nginx
# In nginx.conf
worker_processes auto;  # Use all CPU cores
worker_connections 2048;  # Increase connections
```

### TCP Tuning

```bash
# Edit /etc/sysctl.conf
cat >> /etc/sysctl.conf << EOF
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
net.ipv4.tcp_congestion_control = bbr
EOF

# Apply changes
sysctl -p
```

### FFmpeg Hardware Acceleration (Intel QuickSync)

```bash
# Install VA-API
apt install intel-media-va-driver-non-free -y

# Use in ffmpeg-stream.sh
# Replace: -c:v libx264
# With: -c:v h264_qsv
```

## Support

- **Documentation**: https://github.com/IvyGain/skillfreak-streaming-system
- **Issues**: https://github.com/IvyGain/skillfreak-streaming-system/issues
- **Discord**: SkillFreak Community Server

## License

MIT License - See LICENSE file for details

---

**Last Updated**: 2025-12-04
**Maintainer**: SkillFreak Team
