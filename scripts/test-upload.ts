#!/usr/bin/env ts-node
/**
 * Lark Driveアップロードテスト
 * 既存のダウンロード済みファイルをアップロード
 */

import { uploadVideoToLarkHTTP } from '../lib/lark-drive-http';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const DOWNLOAD_DIR = './downloads';
const VIDEO_ID = 'jjQIZjz2BS8';
const LARK_DRIVE_FOLDER = process.env.LARK_DRIVE_FOLDER_ID!;

async function main() {
  const videoFile = path.join(DOWNLOAD_DIR, `${VIDEO_ID}.mp4`);

  console.log('🧪 Lark Driveアップロードテスト（HTTP直接実装）');
  console.log('='.repeat(60));
  console.log(`📂 ファイル: ${videoFile}`);
  console.log(`📁 Lark Driveフォルダ: ${LARK_DRIVE_FOLDER}`);
  console.log('');

  try {
    const fileToken = await uploadVideoToLarkHTTP(videoFile, LARK_DRIVE_FOLDER);
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ テスト成功！');
    console.log(`📎 File Token: ${fileToken}`);
    console.log('');
    console.log(`Lark Driveで確認: https://ivygain-project.jp.larksuite.com/drive/folder/${LARK_DRIVE_FOLDER}`);
  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    process.exit(1);
  }
}

main();
