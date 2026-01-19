# 並列実行プラン - SkillFreak Streaming System

## システムスペック
- メモリ: 24GB
- 並行実行可能Agent数: 6-8 (各Agent約2-3GB想定)

## タスク分解 (DAG)

### Level 0 - 並列実行可能（依存なし）

#### Agent1: Database Schema Setup
- **Agent**: IssueAgent + CodeGenAgent
- **タスク**: Supabaseスキーマ設計・マイグレーション
- **成果物**:
  - `lib/supabase/schema.sql`
  - `lib/supabase/migrations/`
- **推定時間**: 20分
- **メモリ**: 2GB

#### Agent2: Authentication System
- **Agent**: CodeGenAgent + ReviewAgent
- **タスク**: Supabase Auth統合
- **成果物**:
  - `app/auth/` (ログイン/登録ページ)
  - `lib/auth/` (認証ヘルパー)
- **推定時間**: 25分
- **メモリ**: 2.5GB

#### Agent3: Storage Integration
- **Agent**: CodeGenAgent
- **タスク**: Backblaze B2アップロード/管理機能
- **成果物**:
  - `lib/storage/upload.ts`
  - `lib/storage/archive-manager.ts`
- **推定時間**: 20分
- **メモリ**: 2GB

#### Agent4: UI Components (Base)
- **Agent**: CodeGenAgent
- **タスク**: 共通UIコンポーネント
- **成果物**:
  - `components/ui/` (ボタン、カード、etc)
  - `components/layout/` (ヘッダー、フッター)
- **推定時間**: 30分
- **メモリ**: 2.5GB

#### Agent5: Documentation
- **Agent**: CodeGenAgent
- **タスク**: 不足ドキュメント作成
- **成果物**:
  - `docs/API.md`
  - `docs/DEPLOYMENT.md`
  - `docs/INTEGRATION.md`
- **推定時間**: 15分
- **メモリ**: 1.5GB

### Level 1 - Level 0完了後に並列実行可能

#### Agent6: Stream Player Component
- **依存**: Agent4 (UI Components)
- **Agent**: CodeGenAgent + ReviewAgent
- **タスク**: HLS.js/Video.js統合プレイヤー
- **成果物**:
  - `components/stream/Player.tsx`
  - `components/stream/Controls.tsx`
- **推定時間**: 35分
- **メモリ**: 3GB

#### Agent7: Admin Dashboard
- **依存**: Agent1 (Database), Agent2 (Auth), Agent4 (UI)
- **Agent**: CodeGenAgent + ReviewAgent
- **タスク**: 管理画面実装
- **成果物**:
  - `app/admin/` (ダッシュボードページ)
  - `components/admin/` (統計、設定)
- **推定時間**: 40分
- **メモリ**: 3GB

#### Agent8: API Routes
- **依存**: Agent1 (Database), Agent2 (Auth)
- **Agent**: CodeGenAgent + ReviewAgent + TestAgent
- **タスク**: Next.js API Routes
- **成果物**:
  - `app/api/stream/` (ストリーム管理API)
  - `app/api/webhook/` (Webhook受信)
  - テスト完備
- **推定時間**: 30分
- **メモリ**: 3GB

### Level 2 - Level 1完了後

#### Agent9: VPS Setup Scripts
- **依存**: Agent8 (API)
- **Agent**: CodeGenAgent + ReviewAgent
- **タスク**: VPS配信サーバー設定
- **成果物**:
  - `vps/scripts/stream.sh` (FFmpeg配信スクリプト)
  - `vps/config/nginx.conf`
  - `vps/systemd/stream.service`
- **推定時間**: 25分
- **メモリ**: 2.5GB

#### Agent10: Integration Testing
- **依存**: Agent6, Agent7, Agent8
- **Agent**: TestAgent + ReviewAgent
- **タスク**: E2Eテスト・統合テスト
- **成果物**:
  - `tests/integration/`
  - `tests/e2e/`
- **推定時間**: 30分
- **メモリ**: 3GB

## 並列実行スケジュール

### Phase 1 (Level 0) - 5 Agents並列実行
```
Time: 0-30分
[Agent1] Database Schema  ████████████████████░░░░░░░░░░
[Agent2] Authentication   ██████████████████████████░░░░░
[Agent3] Storage          ████████████████████░░░░░░░░░░
[Agent4] UI Components    ██████████████████████████████░
[Agent5] Documentation    ██████████████░░░░░░░░░░░░░░░░
```

### Phase 2 (Level 1) - 3 Agents並列実行
```
Time: 30-70分
[Agent6] Stream Player    ███████████████████████████████████░░░░░
[Agent7] Admin Dashboard  ████████████████████████████████████████
[Agent8] API Routes       ██████████████████████████████░░░░░░░░░
```

### Phase 3 (Level 2) - 2 Agents並列実行
```
Time: 70-100分
[Agent9] VPS Scripts      ██████████████████████████░░░░
[Agent10] Integration     ██████████████████████████████
```

## tmux実行コマンド

```bash
# セッション作成
tmux new-session -d -s miyabi-parallel

# Level 0 - 5ウィンドウで並列実行
tmux split-window -h -t miyabi-parallel
tmux split-window -v -t miyabi-parallel
tmux split-window -h -t miyabi-parallel
tmux split-window -v -t miyabi-parallel

# 各ウィンドウでAgentを実行
tmux send-keys -t miyabi-parallel:0.0 'ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx miyabi agent run codegen --issue 10' C-m
tmux send-keys -t miyabi-parallel:0.1 'ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx miyabi agent run codegen --issue 11' C-m
tmux send-keys -t miyabi-parallel:0.2 'ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx miyabi agent run codegen --issue 12' C-m
tmux send-keys -t miyabi-parallel:0.3 'ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx miyabi agent run codegen --issue 13' C-m
tmux send-keys -t miyabi-parallel:0.4 'ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npx miyabi agent run codegen --issue 14' C-m

# セッションにアタッチ
tmux attach -t miyabi-parallel
```

## 総推定時間

- **従来の逐次実行**: 270分 (4.5時間)
- **並列実行 (Phase 1-3)**: 100分 (1.7時間)
- **効率化**: 63% 削減

## メモリ使用量

- Phase 1: 10.5GB (5 agents)
- Phase 2: 9GB (3 agents)
- Phase 3: 5.5GB (2 agents)
- **ピーク時**: 10.5GB / 24GB (44% 使用)

安全マージン: 13.5GB 確保 ✅
