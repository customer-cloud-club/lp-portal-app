import type { NextConfig } from "next";
// @ts-ignore - next-pwa lacks type definitions
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Cloudflare Workers互換性のための設定
  // Next.js 15.5+ では serverComponentsExternalPackages は serverExternalPackages に移動
  serverExternalPackages: ['@node-rs/argon2', '@node-rs/bcrypt'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ivygain-project.jp.larksuite.com',
      },
      {
        protocol: 'https',
        hostname: 'lf3-static.bytednsdoc.com',
      },
      {
        protocol: 'https',
        hostname: 'open.larksuite.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/**',
      },
      {
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Cloudflareビルド時はPWAを無効化
  disable: process.env.NODE_ENV === 'development' || process.env.CF_PAGES === '1',
  buildExcludes: [/middleware-manifest\.json$/],
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  fallbacks: {
    document: '/offline',
  },
  // カスタムService Workerディレクトリ（push-handler.jsを含める）
  customWorkerDir: 'worker',
  // ワーカーにインポートするスクリプト
  additionalManifestEntries: [
    { url: '/push-handler.js', revision: '1' },
  ],
});

// PWAなしのシンプル設定
export default nextConfig;
