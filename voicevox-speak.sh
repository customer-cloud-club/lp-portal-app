#!/bin/bash
# VOICEVOX API経由で音声再生するスクリプト（修正版）

# 設定
VOICEVOX_HOST="localhost:50021"
SPEAKER_ID=8  # 春日部つむぎ

# 引数チェック
if [ -z "$1" ]; then
  echo "使用方法: $0 \"喋らせたいテキスト\""
  exit 1
fi

TEXT="$1"
# URL エンコード
ENCODED_TEXT=$(echo -n "$TEXT" | jq -sRr @uri)

echo "🎤 VOICEVOX で喋ります: $TEXT"

# 1. 音声合成用のクエリを作成
echo "📝 音声クエリ作成中..."
QUERY=$(curl -s -X POST \
  "http://${VOICEVOX_HOST}/audio_query?text=${ENCODED_TEXT}&speaker=${SPEAKER_ID}")

if [ $? -ne 0 ] || [ -z "$QUERY" ]; then
  echo "❌ エラー: 音声クエリの作成に失敗しました"
  echo "$QUERY"
  exit 1
fi

# 2. 音声合成を実行
echo "🔊 音声合成中..."
curl -s -X POST \
  "http://${VOICEVOX_HOST}/synthesis?speaker=${SPEAKER_ID}" \
  -H "Content-Type: application/json" \
  -H "accept: audio/wav" \
  -d "$QUERY" \
  -o /tmp/voicevox_output.wav

if [ $? -ne 0 ]; then
  echo "❌ エラー: 音声合成に失敗しました"
  exit 1
fi

# ファイル確認
if [ ! -s /tmp/voicevox_output.wav ]; then
  echo "❌ エラー: 音声ファイルが生成されませんでした"
  cat /tmp/voicevox_output.wav
  exit 1
fi

# 3. 音声を再生
echo "▶️  再生中..."
afplay /tmp/voicevox_output.wav

if [ $? -eq 0 ]; then
  echo "✅ 完了！"
else
  echo "⚠️  再生エラーが発生しましたが、ファイルは生成されました"
  echo "📁 ファイル: /tmp/voicevox_output.wav"
fi
