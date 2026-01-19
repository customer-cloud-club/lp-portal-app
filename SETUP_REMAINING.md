# サービス完成までの残作業

## Phase A: 依存関係のインストール (所要時間: 5分)

```bash
# 必須パッケージ
npm install --legacy-peer-deps \
  react react-dom \
  next \
  @supabase/supabase-js @supabase/ssr \
  @aws-sdk/client-s3 \
  hls.js video.js \
  axios

# 開発用パッケージ  
npm install -D --legacy-peer-deps \
  @types/react @types/react-dom \
  @types/node \
  vitest @vitest/ui \
  @testing-library/react
```

## Phase B: 設定ファイルの調整 (所要時間: 10分)

1. **Next.js設定確認**: `next.config.ts`
2. **Supabaseクライアント初期化**: `src/lib/supabase.ts`
3. **環境変数検証**: `.env`ファイル

## Phase C: ビルド・テスト (所要時間: 15分)

```bash
# TypeScriptコンパイルチェック
npx tsc --noEmit

# テスト実行
npm test

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build
```

## Phase D: デプロイ準備 (所要時間: 20分)

1. Vercel/Netlifyへのデプロイ設定
2. Supabase接続確認
3. Backblaze B2接続確認
4. ストリーミング機能テスト

---

## 推定残作業時間: 50分

現在の完成度: **60-70%**
残り: **依存関係 + 設定調整 + テスト**

すべて完了すれば、**完全に動作するストリーミングサービス**が完成します！
