# SkillFreak 会員管理システム 要件定義書・設計書

## 1. 概要

### 1.1 目的
Discord OAuth認証を基盤とした会員管理システムを構築し、以下を実現する：
- 会員情報の一元管理（LarkBase）
- 決済状況とDiscordロールの自動連携
- プッシュ通知の会員別配信
- ログイン履歴・行動分析

### 1.2 システム全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                    SkillFreak 会員管理システム                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ユーザー   │───▶│Discord   │───▶│SkillFreak│───▶│LarkBase  │ │
│  │(PWA/PC)  │    │OAuth認証 │    │Portal    │    │会員DB    │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │                               │               │        │
│       │         ┌────────────────────┼───────────────┘        │
│       │         │                    │                         │
│       ▼         ▼                    ▼                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │Push通知  │    │Stripe    │    │Discord   │                 │
│  │システム  │    │決済      │    │Bot/API   │                 │
│  └──────────┘    └──────────┘    └──────────┘                 │
│       │               │               │                        │
│       └───────────────┴───────────────┘                        │
│                       │                                        │
│                       ▼                                        │
│              ┌──────────────┐                                  │
│              │自動ロール付与│                                  │
│              │リマインダー  │                                  │
│              │分析レポート  │                                  │
│              └──────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 要件定義

### 2.1 機能要件

#### FR-1: Discord認証連携
| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1.1 | Discord OAuth2でログイン | 必須 |
| FR-1.2 | ログイン時にDiscord ID、ユーザー名、アバターを取得 | 必須 |
| FR-1.3 | SkillFreakサーバーのメンバーシップ確認 | 必須 |
| FR-1.4 | 現在のDiscordロール取得・表示 | 必須 |
| FR-1.5 | ログイン履歴をLarkBaseに記録 | 必須 |

#### FR-2: 会員情報管理
| ID | 要件 | 優先度 |
|----|------|--------|
| FR-2.1 | 会員マスタテーブル（LarkBase）の自動作成・更新 | 必須 |
| FR-2.2 | 初回ログイン時に会員レコード作成 | 必須 |
| FR-2.3 | ログインごとに最終ログイン日時更新 | 必須 |
| FR-2.4 | 通知端末情報と会員の紐付け | 必須 |
| FR-2.5 | 会員ステータス管理（無料/有料/退会） | 必須 |

#### FR-3: 決済連携
| ID | 要件 | 優先度 |
|----|------|--------|
| FR-3.1 | Stripe Webhook受信 | 必須 |
| FR-3.2 | 決済成功時にLarkBase更新 | 必須 |
| FR-3.3 | 決済成功時にDiscordロール自動付与 | 必須 |
| FR-3.4 | サブスク解約時にロール自動削除 | 必須 |
| FR-3.5 | 決済履歴の記録 | 必須 |

#### FR-4: Discordロール管理
| ID | 要件 | 優先度 |
|----|------|--------|
| FR-4.1 | Discord Bot APIでロール付与 | 必須 |
| FR-4.2 | Discord Bot APIでロール削除 | 必須 |
| FR-4.3 | 複数ロール対応（会員種別ごと） | 中 |
| FR-4.4 | ロール変更履歴の記録 | 中 |

#### FR-5: プッシュ通知連携
| ID | 要件 | 優先度 |
|----|------|--------|
| FR-5.1 | 通知端末と会員IDの紐付け | 必須 |
| FR-5.2 | 会員種別ごとの通知配信 | 中 |
| FR-5.3 | 個別会員への通知送信 | 中 |

### 2.2 非機能要件

| ID | 要件 | 詳細 |
|----|------|------|
| NFR-1 | セキュリティ | Discord TokenはCloudflare Secretsで管理 |
| NFR-2 | 可用性 | Cloudflare Workers + LarkBase（高可用性） |
| NFR-3 | スケーラビリティ | 1000会員以上対応 |
| NFR-4 | 監査 | 全操作のログ記録 |

---

## 3. データ設計

### 3.1 LarkBase テーブル構成

#### テーブル1: 会員マスタ (`tbl_members`)

| フィールド名 | 型 | 説明 | 例 |
|-------------|-----|------|-----|
| discord_id | テキスト | Discord ユーザーID（主キー） | "123456789012345678" |
| discord_username | テキスト | Discordユーザー名 | "user#1234" |
| discord_display_name | テキスト | 表示名 | "ユーザー太郎" |
| discord_avatar | URL | アバターURL | "https://cdn.discord..." |
| email | テキスト | メールアドレス（Discordから取得） | "user@example.com" |
| member_status | 単一選択 | 会員ステータス | 無料/有料/退会/停止 |
| member_plan | 単一選択 | 会員プラン | なし/月額/年額/永久 |
| stripe_customer_id | テキスト | Stripe顧客ID | "cus_xxxxx" |
| stripe_subscription_id | テキスト | StripeサブスクID | "sub_xxxxx" |
| discord_roles | テキスト | 現在のDiscordロール（JSON） | ["支払いOK", "運営"] |
| first_login_at | 日時 | 初回ログイン日時 | 2025-01-15 10:30 |
| last_login_at | 日時 | 最終ログイン日時 | 2025-12-14 23:00 |
| login_count | 数値 | ログイン回数 | 42 |
| subscription_started_at | 日時 | 有料会員開始日 | 2025-02-01 |
| subscription_expires_at | 日時 | 有料期限（サブスク更新日） | 2025-03-01 |
| created_at | 日時 | レコード作成日時 | 2025-01-15 10:30 |
| updated_at | 日時 | レコード更新日時 | 2025-12-14 23:00 |

#### テーブル2: ログイン履歴 (`tbl_login_history`)

| フィールド名 | 型 | 説明 | 例 |
|-------------|-----|------|-----|
| record_id | 自動 | レコードID | |
| discord_id | テキスト | Discord ユーザーID | "123456789012345678" |
| login_at | 日時 | ログイン日時 | 2025-12-14 23:00 |
| device_type | 単一選択 | デバイス種別 | PWA/PC/Mobile |
| user_agent | テキスト | User-Agent | "Mozilla/5.0..." |
| ip_address | テキスト | IPアドレス（ハッシュ化推奨） | "xxx.xxx.xxx.xxx" |
| login_method | 単一選択 | ログイン方法 | Discord OAuth |

#### テーブル3: 決済履歴 (`tbl_payment_history`)

| フィールド名 | 型 | 説明 | 例 |
|-------------|-----|------|-----|
| record_id | 自動 | レコードID | |
| discord_id | テキスト | Discord ユーザーID | "123456789012345678" |
| stripe_payment_id | テキスト | Stripe決済ID | "pi_xxxxx" |
| amount | 数値 | 金額 | 1980 |
| currency | テキスト | 通貨 | "jpy" |
| status | 単一選択 | ステータス | 成功/失敗/返金 |
| plan | テキスト | プラン名 | "月額プラン" |
| payment_at | 日時 | 決済日時 | 2025-12-14 23:00 |
| stripe_event_id | テキスト | Stripeイベント ID | "evt_xxxxx" |

#### テーブル4: 通知登録 (`tbl_notifications`) ※既存拡張

| フィールド名 | 型 | 説明 | 追加 |
|-------------|-----|------|------|
| discord_id | テキスト | 紐付け会員ID | **新規** |
| ... | ... | （既存フィールド） | |

#### テーブル5: ロール変更履歴 (`tbl_role_history`)

| フィールド名 | 型 | 説明 | 例 |
|-------------|-----|------|-----|
| record_id | 自動 | レコードID | |
| discord_id | テキスト | Discord ユーザーID | "123456789012345678" |
| action | 単一選択 | アクション | 付与/削除 |
| role_id | テキスト | DiscordロールID | "1440689861844795422" |
| role_name | テキスト | ロール名 | "支払いOK" |
| reason | テキスト | 理由 | "Stripe決済成功" |
| changed_at | 日時 | 変更日時 | 2025-12-14 23:00 |

### 3.2 ER図

```
┌─────────────────┐       ┌─────────────────┐
│   会員マスタ     │       │  ログイン履歴   │
│  (tbl_members)  │──1:N──│(tbl_login_history)│
│                 │       │                 │
│ discord_id (PK) │       │ discord_id (FK) │
│ member_status   │       │ login_at        │
│ stripe_*        │       │ device_type     │
└────────┬────────┘       └─────────────────┘
         │
         │1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   決済履歴       │       │  ロール変更履歴  │
│(tbl_payment_history)│   │(tbl_role_history)│
│                 │       │                 │
│ discord_id (FK) │       │ discord_id (FK) │
│ stripe_*        │       │ role_id         │
│ amount          │       │ action          │
└─────────────────┘       └─────────────────┘
         │
         │1:N
         ▼
┌─────────────────┐
│   通知登録       │
│(tbl_notifications)│
│                 │
│ discord_id (FK) │ ← 新規追加
│ endpoint        │
│ keys            │
└─────────────────┘
```

---

## 4. API設計

### 4.1 認証・会員API

#### POST /api/auth/callback/discord
**処理フロー:**
1. Discord OAuth コールバック受信
2. Discord APIでユーザー情報取得
3. LarkBase 会員マスタを検索
4. 存在しなければ新規作成、存在すれば更新
5. ログイン履歴を記録
6. セッション作成

```typescript
// レスポンス
{
  "user": {
    "id": "123456789012345678",
    "name": "ユーザー太郎",
    "email": "user@example.com",
    "image": "https://cdn.discord...",
    "memberStatus": "有料",
    "roles": ["支払いOK"]
  }
}
```

#### GET /api/members/me
**説明:** 現在ログイン中の会員情報取得

```typescript
// レスポンス
{
  "discordId": "123456789012345678",
  "username": "user#1234",
  "displayName": "ユーザー太郎",
  "memberStatus": "有料",
  "memberPlan": "月額",
  "subscriptionExpiresAt": "2025-03-01T00:00:00Z",
  "roles": ["支払いOK"],
  "loginCount": 42,
  "lastLoginAt": "2025-12-14T23:00:00Z"
}
```

#### GET /api/members/:discordId/history
**説明:** 会員のログイン履歴取得（管理者用）

### 4.2 決済Webhook API

#### POST /api/webhooks/stripe
**処理フロー:**
1. Stripe Webhook署名検証
2. イベントタイプ判定
3. LarkBase更新
4. Discordロール付与/削除
5. 履歴記録

**対応イベント:**
| イベント | 処理 |
|----------|------|
| `checkout.session.completed` | 会員ステータス更新、ロール付与 |
| `customer.subscription.updated` | プラン変更反映 |
| `customer.subscription.deleted` | ロール削除、ステータス変更 |
| `invoice.payment_succeeded` | 決済履歴記録、期限更新 |
| `invoice.payment_failed` | 通知送信 |

### 4.3 Discordロール管理API

#### POST /api/discord/roles/grant
**説明:** ロール付与

```typescript
// リクエスト
{
  "discordId": "123456789012345678",
  "roleId": "1440689861844795422",
  "reason": "Stripe決済成功"
}
```

#### POST /api/discord/roles/revoke
**説明:** ロール削除

### 4.4 通知API（拡張）

#### POST /api/push/send-to-member
**説明:** 特定会員への通知送信

```typescript
// リクエスト
{
  "discordId": "123456789012345678",
  "title": "お知らせ",
  "body": "メッセージ本文",
  "url": "/events/xxx"
}
```

#### POST /api/push/send-to-plan
**説明:** プラン別一斉通知

```typescript
// リクエスト
{
  "memberPlan": "月額",  // または "有料" で全有料会員
  "title": "会員限定",
  "body": "メッセージ",
  "url": "/"
}
```

---

## 5. 処理フロー設計

### 5.1 新規会員登録フロー

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ユーザー│────▶│Discord   │────▶│SkillFreak│────▶│LarkBase  │
│      │     │OAuth     │     │Portal    │     │          │
└──────┘     └──────────┘     └──────────┘     └──────────┘
   │              │                 │                │
   │ 1.ログインボタン               │                │
   │─────────────▶│                 │                │
   │              │                 │                │
   │ 2.Discord認証画面              │                │
   │◀─────────────│                 │                │
   │              │                 │                │
   │ 3.認証許可   │                 │                │
   │─────────────▶│                 │                │
   │              │ 4.トークン発行  │                │
   │              │────────────────▶│                │
   │              │                 │                │
   │              │                 │ 5.ユーザー情報取得
   │              │◀────────────────│                │
   │              │                 │                │
   │              │                 │ 6.会員検索     │
   │              │                 │───────────────▶│
   │              │                 │                │
   │              │                 │ 7.なければ作成 │
   │              │                 │───────────────▶│
   │              │                 │                │
   │              │                 │ 8.ログイン履歴記録
   │              │                 │───────────────▶│
   │              │                 │                │
   │ 9.ログイン完了                 │                │
   │◀────────────────────────────────│                │
   │              │                 │                │
```

### 5.2 決済→ロール付与フロー

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ユーザー│     │Stripe    │     │SkillFreak│     │LarkBase  │     │Discord   │
│      │     │          │     │Webhook   │     │          │     │Bot API   │
└──────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
   │              │                 │                │                │
   │ 1.決済完了   │                 │                │                │
   │─────────────▶│                 │                │                │
   │              │                 │                │                │
   │              │ 2.Webhook送信   │                │                │
   │              │────────────────▶│                │                │
   │              │                 │                │                │
   │              │                 │ 3.署名検証     │                │
   │              │                 │────────┐      │                │
   │              │                 │◀───────┘      │                │
   │              │                 │                │                │
   │              │                 │ 4.会員検索     │                │
   │              │                 │───────────────▶│                │
   │              │                 │                │                │
   │              │                 │ 5.ステータス更新                │
   │              │                 │───────────────▶│                │
   │              │                 │                │                │
   │              │                 │ 6.決済履歴記録 │                │
   │              │                 │───────────────▶│                │
   │              │                 │                │                │
   │              │                 │ 7.ロール付与   │                │
   │              │                 │───────────────────────────────▶│
   │              │                 │                │                │
   │              │                 │ 8.ロール履歴記録                │
   │              │                 │───────────────▶│                │
   │              │                 │                │                │
   │ 9.通知「会員登録完了」         │                │                │
   │◀────────────────────────────────│                │                │
   │              │                 │                │                │
```

### 5.3 サブスク解約フロー

```
Stripe解約イベント
       │
       ▼
┌──────────────┐
│Webhook受信   │
│署名検証      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│LarkBase      │
│・ステータス→退会│
│・期限クリア   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Discord Bot   │
│・ロール削除   │
│「支払いOK」   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│履歴記録      │
│・ロール変更履歴│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│通知送信（任意）│
│「退会処理完了」│
└──────────────┘
```

---

## 6. 環境変数・シークレット

### 6.1 必要な環境変数

```bash
# Discord OAuth
DISCORD_CLIENT_ID=1421044988170473564
DISCORD_CLIENT_SECRET=xxxxx
DISCORD_GUILD_ID=1189478304424656906
DISCORD_MEMBER_ROLE_ID=1440689861844795422

# Discord Bot（ロール付与用）
DISCORD_BOT_TOKEN=xxxxx  # 新規追加

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_MONTHLY=price_xxxxx
STRIPE_PRICE_ID_YEARLY=price_xxxxx

# LarkBase
LARK_APP_ID=cli_a85cf9e496f8de1c
LARK_APP_SECRET=xxxxx
LARKBASE_APP_TOKEN=xxxxx
LARKBASE_MEMBERS_TABLE_ID=xxxxx      # 新規作成
LARKBASE_LOGIN_HISTORY_TABLE_ID=xxxxx # 新規作成
LARKBASE_PAYMENT_HISTORY_TABLE_ID=xxxxx # 新規作成
LARKBASE_ROLE_HISTORY_TABLE_ID=xxxxx # 新規作成
LARKBASE_NOTIFICATION_TABLE_ID=tbl1ciWJquMptdVN  # 既存
```

### 6.2 Discord Bot権限

Discord Botに必要な権限（OAuth2 Scopes & Bot Permissions）:
- `bot` scope
- `Manage Roles` permission
- Bot がロール付与対象のロールより上位に配置されていること

---

## 7. 実装優先度・フェーズ

### Phase 1: 会員マスタ・ログイン連携（1-2日）
- [ ] 会員マスタテーブル作成（LarkBase）
- [ ] ログイン履歴テーブル作成
- [ ] Discord認証時の会員レコード作成/更新
- [ ] ログイン履歴記録
- [ ] 通知登録とdiscord_idの紐付け

### Phase 2: Stripe決済連携（2-3日）
- [ ] 決済履歴テーブル作成
- [ ] Stripe Webhook API実装
- [ ] 決済成功時のLarkBase更新
- [ ] 決済履歴記録

### Phase 3: Discordロール自動管理（1-2日）
- [ ] Discord Bot作成・招待
- [ ] ロール変更履歴テーブル作成
- [ ] ロール付与API実装
- [ ] ロール削除API実装
- [ ] 決済連携（Webhook→ロール付与）

### Phase 4: 通知拡張（1日）
- [ ] 会員別通知送信API
- [ ] プラン別一斉通知API
- [ ] 管理画面（任意）

---

## 8. セキュリティ考慮事項

| リスク | 対策 |
|--------|------|
| Webhook偽装 | Stripe署名検証必須 |
| トークン漏洩 | Cloudflare Secretsで管理 |
| 不正ロール付与 | Webhook経由のみ許可 |
| 個人情報 | IPアドレスはハッシュ化 |
| レート制限 | Discord API制限考慮（1秒1リクエスト） |

---

## 9. 今後の拡張案

1. **管理ダッシュボード**: 会員一覧、決済状況、ログイン分析
2. **自動リマインダー**: サブスク更新日前の通知
3. **退会防止**: 解約前の引き止め施策連携
4. **ポイントシステム**: イベント参加ポイント付与
5. **紹介プログラム**: 紹介コード発行・追跡

---

## 付録: 既存システムとの統合ポイント

### A. 現在の認証フロー（lib/auth-options.ts）への追加

```typescript
// callbacks.signIn に追加
async signIn({ user, account, profile }) {
  // 1. LarkBase会員マスタを更新
  await upsertMember({
    discordId: profile.id,
    username: profile.username,
    displayName: profile.global_name,
    avatar: profile.avatar,
    email: profile.email,
  });

  // 2. ログイン履歴を記録
  await recordLoginHistory({
    discordId: profile.id,
    deviceType: detectDeviceType(request),
    userAgent: request.headers['user-agent'],
  });

  return true;
}
```

### B. 通知登録との紐付け（lib/subscription-store.ts）

```typescript
// saveSubscription に discordId を追加
export async function saveSubscription(
  subscription: PushSubscriptionData,
  discordId?: string  // セッションから取得
): Promise<boolean> {
  // ... 既存処理
  const fields = {
    // ... 既存フィールド
    'Discord ID': discordId || '',  // 追加
  };
}
```

---

*ドキュメント作成日: 2025-12-14*
*バージョン: 1.0*
