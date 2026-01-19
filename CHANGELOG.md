# Changelog

## [Unreleased] - 2025-01-20

### Added - 全機能実装完了（並列実行による最高効率開発）

#### Phase 1: Discord認証統合 ✅
- Discord OAuth2認証システム実装 (`lib/discord-auth.ts`)
- NextAuth統合とセッション管理 (`app/api/auth/[...nextauth]/route.ts`)
- SkillFreakサーバー連携とメンバーロール確認
- サインインページUI (`app/auth/signin/page.tsx`)
- 会員/非会員権限管理ミドルウェア (`lib/auth-middleware.ts`)

#### Phase 2: LarkBase統合 ✅
- LarkBase双方向同期ライブラリ (`lib/portalapp-sync.ts`)
- イベント一覧・作成・更新API
- アーカイブURL自動登録機能
- LarkBase統合テストスクリプト (`scripts/test-larkbase-integration.ts`)

#### Phase 3: 会員制機能 ✅
- 会員限定コンテンツ表示コンポーネント (`components/MemberOnly.tsx`)
- 会員向けアーカイブ動画埋め込み再生 (`app/events/[id]/MemberVideoSection.tsx`)
- 非会員向けイベント一覧表示（動画なし）
- SkillFreak入会導線UI実装

#### Phase 4: クラウドストレージ連携 ✅
- Lark Drive HTTP API直接実装 (`lib/lark-drive-http.ts`)
- 分割アップロード対応（大容量ファイル対応）
- 視聴用URL発行機能（既存機能利用）
- PortalApp埋め込み再生機能

#### ドキュメント ✅
- デプロイメントガイド (`README_DEPLOYMENT.md`)
- API ドキュメント (`docs/API.md`)
- 統合テスト (`tests/integration.test.ts`)

### Changed
- `package.json`: axios, form-data, next-auth依存関係追加
- `lib/portalapp-sync.ts`: VIEW_ID対応追加
- `scripts/test-upload.ts`: HTTP API呼び出しに変更

### Fixed
- Lark SDK uploadPart API null問題回避（HTTP直接実装で解決）
- LarkBase アクセストークンエラー解決

### Technical Details
- **並列実行**: tmux 5ウィンドウで同時開発
- **実装時間**: 約30分（並列最適化により）
- **新規ファイル数**: 12ファイル
- **コード行数**: 約1500行追加
- **テストカバレッジ**: 統合テストスクリプト完備

### Performance
- HTTPアップロード: 507MB動画を約5分でアップロード完了
- 分割アップロード: 127パート（4MB/パート）
- エラーハンドリング: リトライ機能付き

### Security
- Discord OAuth2による認証
- NextAuth セッション管理
- 会員/非会員アクセス制御
- 環境変数による機密情報管理

## [1.0.0] - 2025-01-19

### Added
- YouTube → Lark Drive自動アーカイブシステム
- LarkBase イベント管理DB
- Portal イベントページ（一覧・詳細）
- 24時間VOD配信プレイヤー
- Lark Drive動画再生コンポーネント

### Infrastructure
- Next.js 15 + React 19
- Tailwind CSS
- Lark SDK統合
- yt-dlp自動ダウンロード
