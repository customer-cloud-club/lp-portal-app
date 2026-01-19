# 統合ガイド

SkillFreak Streaming System の外部サービス統合手順

## 目次

1. [Lark/Feishu API統合](#larkfeishu-api統合)
2. [Discord OAuth2統合](#discord-oauth2統合)
3. [LarkBase多元表設定](#larkbase多元表設定)
4. [YouTube自動アーカイブ](#youtube自動アーカイブ)
5. [トラブルシューティング](#トラブルシューティング)

---

## Lark/Feishu API統合

### 概要

このシステムは以下のLark機能を統合しています:

- **Lark Drive**: 動画ファイルストレージ
- **LarkBase**: イベント管理データベース
- **Lark API**: 認証・ファイル操作

### 1. Lark Appの作成

#### Step 1: アプリを作成

1. **Lark Open Platformにアクセス**
   - 国際版: https://open.larksuite.com/
   - 中国版: https://open.feishu.cn/

2. **新規アプリを作成**
   - "開発者コンソール" → "アプリを作成"
   - アプリ名: `SkillFreak Streaming System`
   - アプリタイプ: "自社開発アプリ"

3. **認証情報を取得**
   ```bash
   # 「認証情報」タブから取得
   LARK_APP_ID=cli_xxxxxxxxxxxxx
   LARK_APP_SECRET=xxxxxxxxxxxxx
   ```

#### Step 2: 権限を設定

「権限管理」→ 以下の権限を追加:

##### 必須権限

| 権限 | スコープ | 用途 |
|-----|---------|------|
| `drive:drive` | Driveアクセス | フォルダ一覧取得 |
| `drive:file:readonly` | ファイル読み取り | 動画URL取得 |
| `drive:file:write` | ファイル書き込み | 動画アップロード |
| `bitable:app` | LarkBaseアクセス | テーブル読み取り |
| `bitable:record` | レコード操作 | イベント情報CRUD |

##### オプション権限

| 権限 | スコープ | 用途 |
|-----|---------|------|
| `drive:file:upload` | ファイルアップロード | 大容量ファイル対応 |
| `drive:media` | メディアアクセス | 動画ストリーミング |
| `im:message` | メッセージ送信 | 通知機能（将来） |

#### Step 3: アプリを公開

1. **バージョン管理**
   - "バージョン管理" → "新バージョンを作成"
   - バージョン番号: `1.0.0`
   - 更新内容: 初回リリース

2. **承認依頼**
   - "公開申請" → 組織管理者に通知
   - 管理者が承認すると全社で利用可能

3. **インストール**
   - 承認後、ワークスペースにアプリをインストール

---

### 2. Lark Drive設定

#### フォルダ作成

1. **Lark Driveを開く**
   - Lark → "Drive" → "マイドライブ"

2. **アーカイブ用フォルダを作成**
   - "新規作成" → "フォルダ"
   - フォルダ名: `SkillFreak アーカイブ`

3. **フォルダIDを取得**
   ```bash
   # フォルダ右クリック → "リンクをコピー"
   # URL: https://xxx.larksuite.com/drive/folder/R2oWfpO5wlLEwBd5dMIjGRwvp2g

   LARK_DRIVE_FOLDER_ID=R2oWfpO5wlLEwBd5dMIjGRwvp2g
   ```

#### 権限設定

1. **アプリに権限を付与**
   - フォルダ右クリック → "共有設定"
   - "メンバーを追加" → アプリを検索
   - 権限: "編集可能"

2. **公開範囲の設定**
   - "リンクを知っている全員": オフ（会員のみアクセス）
   - "組織内のメンバー": オン

---

### 3. Lark API使用例

#### 一時URLの取得

```typescript
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark, // または Domain.Feishu
});

// 一時ダウンロードURL取得（24時間有効）
const res = await client.drive.media.batchGetTmpDownloadUrl({
  params: {
    file_tokens: ['file_token_xxx'],
  },
});

const tmpUrl = res.data?.tmp_download_urls?.[0]?.tmp_download_url;
console.log(tmpUrl); // https://example.larksuite.com/temp/xxx
```

#### ファイルアップロード

```typescript
import { uploadVideoToLarkHTTP } from '@/lib/lark-drive-http';

// 大容量ファイル対応（分割アップロード）
const fileToken = await uploadVideoToLarkHTTP(
  '/path/to/video.mp4',
  process.env.LARK_DRIVE_FOLDER_ID!
);

console.log('アップロード完了:', fileToken);
```

---

## Discord OAuth2統合

### 概要

Discord OAuth2を使用してSkillFreak会員を識別します。

- **認証フロー**: Authorization Code Grant
- **スコープ**: `identify`, `email`, `guilds`, `guilds.members.read`
- **会員判定**: ロールIDで判定

### 1. Discord Applicationの作成

#### Step 1: アプリケーションを作成

1. **Discord Developer Portalにアクセス**
   - URL: https://discord.com/developers/applications

2. **New Applicationを作成**
   - アプリ名: `SkillFreak Portal`
   - 利用規約に同意

3. **Client IDを取得**
   ```bash
   # "General Information" タブ
   DISCORD_CLIENT_ID=1421044988170473564
   ```

#### Step 2: OAuth2を設定

1. **Redirect URIsを追加**
   - "OAuth2" → "General" → "Redirects"
   - 追加するURI:
     ```
     https://your-domain.vercel.app/api/auth/callback/discord
     http://localhost:3000/api/auth/callback/discord
     ```

2. **Client Secretを生成**
   ```bash
   # "OAuth2" → "Client information" → "Reset Secret"
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   ```

3. **スコープを確認**
   - "OAuth2" → "URL Generator"
   - 必要なスコープ:
     - `identify` - ユーザー情報
     - `email` - メールアドレス
     - `guilds` - サーバー一覧
     - `guilds.members.read` - メンバー情報

---

### 2. Discord サーバー設定

#### Guild ID（サーバーID）を取得

1. **開発者モードを有効化**
   - Discord → 設定 → 詳細設定 → "開発者モード" をオン

2. **Guild IDをコピー**
   - サーバーを右クリック → "IDをコピー"
   ```bash
   DISCORD_GUILD_ID=1189478304424656906
   ```

#### 会員ロールIDを取得

1. **ロール設定を開く**
   - サーバー設定 → ロール → "支払いOK" (会員ロール)

2. **ロールIDをコピー**
   - ロールを右クリック → "IDをコピー"
   ```bash
   DISCORD_MEMBER_ROLE_ID=1440689861844795422
   ```

---

### 3. NextAuth.js設定

#### `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { isSkillFreakMember } from '@/lib/discord-auth';

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds guilds.members.read',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.discordId = profile.id;

        // 会員チェック（初回のみ）
        const isMember = await isSkillFreakMember(
          account.access_token,
          process.env.DISCORD_GUILD_ID!,
          process.env.DISCORD_MEMBER_ROLE_ID!
        );

        token.isMember = isMember;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.discordId;
      session.user.isMember = token.isMember || false;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

### 4. 認証フロー

#### フロー図

```
1. ユーザー → /auth/signin
        ↓
2. Discord認証画面
        ↓
3. ユーザーが承認
        ↓
4. Callback → /api/auth/callback/discord
        ↓
5. アクセストークン取得
        ↓
6. Discord API: ギルドメンバー情報取得
        ↓
7. ロールチェック → isMember判定
        ↓
8. セッション作成 → ホームにリダイレクト
```

#### コード例

**サインインボタン:**
```typescript
'use client';
import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button onClick={() => signIn('discord')}>
      Discordでログイン
    </button>
  );
}
```

**セッション取得:**
```typescript
import { getServerSession } from 'next-auth';

export default async function Page() {
  const session = await getServerSession();

  if (!session?.user) {
    return <div>未ログイン</div>;
  }

  return (
    <div>
      <p>ようこそ {session.user.name} さん</p>
      <p>会員: {session.user.isMember ? 'はい' : 'いいえ'}</p>
    </div>
  );
}
```

---

## LarkBase多元表設定

### 概要

LarkBaseをデータベースとして使用し、イベント情報を管理します。

### 1. LarkBaseの作成

#### Step 1: Baseを作成

1. **Larkで新規Base作成**
   - Lark → "Base" → "新規作成"
   - Base名: `SkillFreak イベント管理`

2. **テーブルを作成**
   - テーブル名: `イベント一覧`

3. **App TokenとTable IDを取得**
   ```bash
   # URL: https://xxx.larksuite.com/base/{APP_TOKEN}?table={TABLE_ID}

   LARKBASE_APP_TOKEN=PxvIwd2fniGE5pkiC0YjHCNEpad
   LARKBASE_TABLE_ID=tblnPssJqIBXNi6a
   ```

---

### 2. テーブルスキーマ

#### 必須フィールド

| フィールド名 | タイプ | 設定 | 説明 |
|-------------|--------|------|------|
| イベントタイトル | テキスト | 必須 | イベント名 |
| 告知用文章 | 複数行テキスト | | イベント説明 |
| イベント開始日時 | 日時 | 必須 | 開催日時 |
| セミナーURL | URL | | YouTube Live URL |
| アーカイブ動画 | 添付ファイル/URL | | Lark Drive動画 |
| アーカイブファイルトークン | テキスト | | ファイルトークン |

#### 拡張フィールド（オプション）

| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| サムネイル | 添付ファイル | イベントサムネイル |
| 登壇者 | ユーザー | 登壇者情報 |
| 登壇者名 | テキスト | 登壇者の名前 |
| 登壇者肩書 | テキスト | 登壇者の役職 |
| 時間（分） | 数値 | 動画の長さ |
| カテゴリ | 単一選択 | business/tech/design |
| タグ | 複数選択 | AI/Web3/Marketing等 |
| 参加者数 | 数値 | 参加者数 |
| 評価 | 数値 | 5段階評価 |
| 開催場所 | テキスト | オンライン/会場名 |
| アンケートURL | URL | イベント後アンケート |
| 公開設定 | 単一選択 | public/members-only |

---

### 3. LarkBase APIの使用

#### イベント一覧取得

```typescript
import { getAllEvents } from '@/lib/larkbase-client';

const events = await getAllEvents({
  status: 'published',
  visibility: 'public',
  limit: 50
});

console.log(`取得件数: ${events.length}`);
```

#### イベント詳細取得

```typescript
import { getEventById } from '@/lib/larkbase-client';

const event = await getEventById('rec123');

if (event) {
  console.log(event.title);
  console.log(event.description);
  console.log(event.archive_url);
}
```

#### イベント作成（手動またはAPI経由）

```typescript
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

const res = await client.bitable.appTableRecord.create({
  path: {
    app_token: process.env.LARKBASE_APP_TOKEN!,
    table_id: process.env.LARKBASE_TABLE_ID!,
  },
  data: {
    fields: {
      'イベントタイトル': 'サンプルイベント',
      '告知用文章': 'これはテストイベントです',
      'イベント開始日時': new Date().getTime(),
      'セミナーURL': 'https://youtube.com/watch?v=xxxxx',
      '時間（分）': 60,
    },
  },
});

console.log('作成完了:', res.data?.record?.record_id);
```

---

### 4. フィールドマッピング

システム内部では以下のマッピングを使用:

```typescript
// LarkBase → システム内部
{
  id: item.record_id,
  title: fields['イベントタイトル'],
  description: fields['告知用文章'],
  scheduled_at: new Date(fields['イベント開始日時']).toISOString(),
  youtube_url: fields['セミナーURL']?.link || fields['セミナーURL']?.text,
  archive_url: fields['アーカイブ動画']?.link,
  archive_file_token: fields['アーカイブファイルトークン'],
  thumbnail: fields['サムネイル'],
  speaker: {
    name: fields['登壇者名'] || 'SkillFreak',
    title: fields['登壇者肩書'],
  },
  duration: parseInt(fields['時間（分）'] || '60', 10),
  category: fields['カテゴリ'],
  tags: fields['タグ'],
}
```

---

## YouTube自動アーカイブ

### 概要

YouTube Live終了後の動画を自動的にLark Driveにアーカイブします。

### 1. yt-dlpのインストール

#### macOS

```bash
# Homebrew
brew install yt-dlp

# または Python pip
pip install yt-dlp
```

#### Linux

```bash
# apt (Ubuntu/Debian)
sudo apt install yt-dlp

# または Python pip
pip3 install yt-dlp
```

#### Windows

```bash
# Chocolatey
choco install yt-dlp

# または Python pip
pip install yt-dlp
```

---

### 2. 手動アーカイブ

#### コマンド実行

```bash
# YouTubeからダウンロード → Lark Driveにアップロード
npx ts-node scripts/youtube-to-lark-drive.ts "https://www.youtube.com/watch?v=xxxxx"
```

#### 既存イベントに追加

```bash
# LarkBaseの既存レコードにアーカイブURLを追加
npx ts-node scripts/youtube-to-lark-drive.ts \
  "https://www.youtube.com/watch?v=xxxxx" \
  --record-id recXXXXXX
```

---

### 3. 自動アーカイブ（GitHub Actions）

#### ワークフロー例

`.github/workflows/auto-archive.yml`:

```yaml
name: Auto Archive

on:
  schedule:
    - cron: '0 * * * *' # 毎時実行
  workflow_dispatch:

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Install yt-dlp
        run: |
          sudo apt-get update
          sudo apt-get install -y yt-dlp

      - name: Run auto archive script
        env:
          LARK_APP_ID: ${{ secrets.LARK_APP_ID }}
          LARK_APP_SECRET: ${{ secrets.LARK_APP_SECRET }}
          LARK_DRIVE_FOLDER_ID: ${{ secrets.LARK_DRIVE_FOLDER_ID }}
          LARKBASE_APP_TOKEN: ${{ secrets.LARKBASE_APP_TOKEN }}
          LARKBASE_TABLE_ID: ${{ secrets.LARKBASE_TABLE_ID }}
        run: |
          npx ts-node scripts/auto-archive-ended-events.ts
```

---

### 4. アーカイブスクリプトの仕組み

#### フロー

```
1. LarkBaseから終了したイベントを取得
   ↓
2. YouTube URLがあるイベントを抽出
   ↓
3. yt-dlpで動画をダウンロード
   ↓
4. Lark Drive HTTPで大容量アップロード
   ↓
5. ファイルトークンを取得
   ↓
6. LarkBaseの「アーカイブ動画」フィールドを更新
   ↓
7. ローカルファイルを削除
```

#### コード例

```typescript
import { execSync } from 'child_process';
import { uploadVideoToLarkHTTP } from '@/lib/lark-drive-http';
import { registerArchiveUrl } from '@/lib/portalapp-sync';

// 1. YouTube動画ダウンロード
const ytdlpCmd = 'yt-dlp';
const cmd = `${ytdlpCmd} \
  --format 'bestvideo[height<=1080]+bestaudio/best' \
  --merge-output-format mp4 \
  -o "downloads/%(id)s.%(ext)s" \
  "${youtubeUrl}"`;

execSync(cmd);

// 2. Lark Driveにアップロード
const fileToken = await uploadVideoToLarkHTTP(
  videoFilePath,
  process.env.LARK_DRIVE_FOLDER_ID!
);

// 3. LarkBaseを更新
await registerArchiveUrl(eventId, fileToken);
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. Lark API 403 Forbidden

**症状:**
```json
{
  "code": 99991663,
  "msg": "Permission denied: app lacks required permission"
}
```

**原因:** アプリ権限が不足

**解決方法:**
1. Lark Open Platform → アプリ → 権限管理
2. 必要な権限を追加:
   - `drive:drive`
   - `drive:file:readonly`
   - `drive:file:write`
   - `bitable:app`
   - `bitable:record`
3. アプリを再公開 → 管理者承認
4. ワークスペースで再インストール

---

#### 2. LarkBase フィールドが取得できない

**症状:**
```typescript
fields['イベントタイトル'] // => undefined
```

**原因:** フィールド名の不一致

**解決方法:**
1. LarkBaseでフィールド名を確認（日本語/英語）
2. コード内のマッピングを修正:
   ```typescript
   // 英語フィールド名の場合
   title: fields['Event Title'] || fields['イベントタイトル']
   ```

---

#### 3. Discord OAuth2 Redirect URI mismatch

**症状:**
```
redirect_uri_mismatch
```

**原因:** Discord Developer PortalのRedirect URIが一致しない

**解決方法:**
1. Discord Developer Portal → OAuth2 → Redirects
2. 正確なURLを追加:
   ```
   https://your-domain.vercel.app/api/auth/callback/discord
   ```
3. プロトコル（https/http）とパスが完全一致していることを確認

---

#### 4. Discord 会員チェックでレート制限

**症状:**
```
Discord API rate limit: 429 Too Many Requests
```

**原因:** Discord API呼び出しが多すぎる

**解決方法:**
1. NextAuth callbackで初回認証時のみチェック:
   ```typescript
   if (account && profile) {
     // 初回のみAPIコール
     const isMember = await isSkillFreakMember(...);
     token.isMember = isMember;
   }
   // 以降はトークンから読み取り
   ```

2. キャッシュを実装（Redis等）

---

#### 5. yt-dlp ダウンロードエラー

**症状:**
```
ERROR: This video is unavailable
```

**原因:** 動画が非公開/削除されている

**解決方法:**
1. YouTube URLが正しいか確認
2. 動画が公開されているか確認
3. yt-dlpを最新版に更新:
   ```bash
   pip install --upgrade yt-dlp
   ```

---

#### 6. Lark Drive アップロードが失敗

**症状:**
```
Upload failed: file too large
```

**原因:** ファイルサイズ制限（10GB）

**解決方法:**
1. 動画を圧縮:
   ```bash
   ffmpeg -i input.mp4 -vcodec h264 -acodec aac output.mp4
   ```

2. 分割アップロードを使用（既に実装済み）:
   ```typescript
   import { uploadVideoToLarkHTTP } from '@/lib/lark-drive-http';
   ```

---

### デバッグ方法

#### Lark API デバッグ

```typescript
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
  loggerLevel: lark.LoggerLevel.debug, // デバッグログ有効
});

// APIコール
const res = await client.drive.file.get({ ... });

console.log('Response:', JSON.stringify(res, null, 2));
```

#### Discord API デバッグ

```bash
# アクセストークンでユーザー情報取得
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://discord.com/api/v10/users/@me

# ギルドメンバー情報取得
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://discord.com/api/v10/users/@me/guilds/YOUR_GUILD_ID/member
```

#### LarkBase データ確認

```bash
# イベント一覧API
curl http://localhost:3000/api/archives

# 特定イベント
curl http://localhost:3000/api/archive/rec123
```

---

## ベストプラクティス

### 1. エラーハンドリング

```typescript
try {
  const events = await getAllEvents();
} catch (error) {
  console.error('LarkBase Error:', error);

  // リトライロジック
  if (error.code === 99991663) {
    // 権限エラー → 管理者に通知
  } else if (error.code === 429) {
    // レート制限 → 待機後リトライ
    await new Promise(r => setTimeout(r, 5000));
  }
}
```

### 2. キャッシング

```typescript
// Lark Drive 一時URLのキャッシュ（24時間）
const cache = new Map<string, { url: string, expires: number }>();

export async function getCachedVideoUrl(fileToken: string): Promise<string> {
  const cached = cache.get(fileToken);

  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  const url = await getTemporaryVideoUrl(fileToken);

  cache.set(fileToken, {
    url,
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  return url;
}
```

### 3. バッチ処理

```typescript
// 複数イベントを効率的に処理
const events = await getAllEvents();

// 並列処理（最大5並列）
const BATCH_SIZE = 5;
for (let i = 0; i < events.length; i += BATCH_SIZE) {
  const batch = events.slice(i, i + BATCH_SIZE);
  await Promise.all(
    batch.map(event => processEvent(event))
  );
}
```

---

## 参考資料

### 公式ドキュメント

- **Lark Open Platform**: https://open.larksuite.com/document/
- **Lark Drive API**: https://open.larksuite.com/document/server-docs/docs/drive-v1/folder
- **LarkBase API**: https://open.larksuite.com/document/server-docs/docs/bitable-v1/app
- **Discord API**: https://discord.com/developers/docs
- **NextAuth.js**: https://next-auth.js.org/

### SDK

- **Lark Node SDK**: https://github.com/larksuite/node-sdk
- **yt-dlp**: https://github.com/yt-dlp/yt-dlp

---

## サポート

統合に関する問題は以下で質問してください:

- **プロジェクト GitHub Issues**: https://github.com/IvyGain/skillfreak-streaming-system/issues
- **Lark サポート**: https://open.larksuite.com/support
- **Discord Developer Support**: https://discord.com/developers/docs/topics/community-resources

---

以上で統合ガイドは完了です。
