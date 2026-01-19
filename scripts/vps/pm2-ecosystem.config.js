/**
 * PM2 Ecosystem Configuration
 * SkillFreak 24-Hour Streaming System
 *
 * This file defines PM2 process management for the streaming server.
 *
 * Usage:
 *   pm2 start pm2-ecosystem.config.js
 *   pm2 restart streaming
 *   pm2 stop streaming
 *   pm2 logs streaming
 *   pm2 monit
 *
 * Configuration:
 *   - Auto-restart on crash
 *   - Log rotation
 *   - Memory limits
 *   - Environment variables
 */

module.exports = {
  apps: [
    {
      // Main streaming process
      name: 'skillfreak-streaming',
      script: '/opt/streaming/scripts/ffmpeg-stream.sh',
      args: '/opt/streaming/videos rtmp://localhost/live/skillfreak --loop 0',

      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',

      // Restart configuration
      restart_delay: 5000,              // Wait 5s before restart
      max_restarts: 10,                 // Max 10 restarts within 1 minute
      min_uptime: '10s',                // Minimum uptime before considered stable

      // Logs
      error_file: '/opt/streaming/logs/streaming-error.log',
      out_file: '/opt/streaming/logs/streaming-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
        STREAM_NAME: 'skillfreak',
        RTMP_URL: 'rtmp://localhost/live/skillfreak',
        VIDEO_FOLDER: '/opt/streaming/videos',
      },

      // Cron restart (optional: restart daily at 4 AM)
      cron_restart: '0 4 * * *',

      // Kill timeout
      kill_timeout: 5000,
    },

    {
      // Archive downloader (scheduled task)
      name: 'youtube-archiver',
      script: 'node',
      args: '/opt/streaming/scripts/download-archives.js',

      // Run as cron job (every 6 hours)
      cron_restart: '0 */6 * * *',
      autorestart: false,
      watch: false,

      // Logs
      error_file: '/opt/streaming/logs/archiver-error.log',
      out_file: '/opt/streaming/logs/archiver-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Environment
      env: {
        NODE_ENV: 'production',
        DOWNLOAD_DIR: '/opt/streaming/videos',
      },
    },

    {
      // Health monitor
      name: 'stream-health-monitor',
      script: 'node',
      args: '/opt/streaming/scripts/health-monitor.js',

      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,

      // Check every 30 seconds
      restart_delay: 30000,

      // Logs
      error_file: '/opt/streaming/logs/health-error.log',
      out_file: '/opt/streaming/logs/health-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Environment
      env: {
        NODE_ENV: 'production',
        NGINX_STATUS_URL: 'http://localhost:8080/nginx_status',
        RTMP_STAT_URL: 'http://localhost:8080/stat',
        ALERT_WEBHOOK: process.env.DISCORD_WEBHOOK_URL || '',
      },
    },

    {
      // Log cleaner (runs daily)
      name: 'log-cleaner',
      script: 'bash',
      args: '-c "find /opt/streaming/logs -name \'*.log\' -mtime +7 -delete && find /var/www/hls -name \'*.ts\' -mtime +1 -delete"',

      // Run daily at 3 AM
      cron_restart: '0 3 * * *',
      autorestart: false,
      watch: false,

      // Logs
      error_file: '/opt/streaming/logs/cleaner-error.log',
      out_file: '/opt/streaming/logs/cleaner-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  /**
   * Deployment configuration (optional)
   *
   * Usage:
   *   pm2 deploy production setup
   *   pm2 deploy production update
   *   pm2 deploy production revert
   */
  deploy: {
    production: {
      user: 'ubuntu',
      host: process.env.VPS_HOST || 'streaming.skillfreak.com',
      ref: 'origin/main',
      repo: 'git@github.com:IvyGain/skillfreak-streaming-system.git',
      path: '/opt/streaming',
      ssh_options: 'StrictHostKeyChecking=no',

      // Pre-deploy
      'pre-deploy-local': 'echo "Starting deployment..."',

      // Post-deploy
      'post-deploy': [
        'npm install',
        'npm run build',
        'pm2 reload pm2-ecosystem.config.js',
        'pm2 save',
      ].join(' && '),

      // Environment
      env: {
        NODE_ENV: 'production',
      },
    },

    staging: {
      user: 'ubuntu',
      host: process.env.STAGING_HOST || 'staging.skillfreak.com',
      ref: 'origin/develop',
      repo: 'git@github.com:IvyGain/skillfreak-streaming-system.git',
      path: '/opt/streaming-staging',
      ssh_options: 'StrictHostKeyChecking=no',

      'post-deploy': [
        'npm install',
        'npm run build',
        'pm2 reload pm2-ecosystem.config.js',
        'pm2 save',
      ].join(' && '),

      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
