#!/usr/bin/env tsx
/**
 * Supabase Connection Test
 *
 * Supabaseへの接続とテーブルアクセスをテスト
 *
 * 使い方:
 *   npx tsx scripts/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';

// 環境変数読み込み
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function testConnection() {
  console.log('\n🔍 Supabase Connection Test\n');
  console.log('='.repeat(50));

  // 環境変数チェック
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing environment variables:');
    console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_KEY ? '✓' : '✗');
    console.error('\n⚠️  Please check your .env file');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Key: ${SUPABASE_KEY.substring(0, 20)}...`);
  console.log('');

  // Supabaseクライアント作成
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. 接続テスト（シンプルなクエリ）
    console.log('1️⃣  Testing basic connection...');
    const { error: connectionError } = await supabase
      .from('archives')
      .select('count')
      .limit(0);

    if (connectionError) {
      // テーブルが存在しない場合のエラーは想定内
      if (connectionError.code === '42P01') {
        console.log('   ⚠️  Table "archives" does not exist yet');
        console.log('   ℹ️  Run SQL scripts in Supabase dashboard to create tables');
      } else {
        throw connectionError;
      }
    } else {
      console.log('   ✅ Connected successfully');
    }

    // 2. 各テーブルの存在確認
    console.log('\n2️⃣  Checking tables...');
    const tables = ['archives', 'download_jobs', 'playlists', 'stream_stats', 'viewer_sessions'];

    for (const table of tables) {
      const { error } = await supabase
        .from(table as any)
        .select('count')
        .limit(0);

      if (error) {
        if (error.code === '42P01') {
          console.log(`   ⚠️  ${table}: not created yet`);
        } else {
          console.log(`   ❌ ${table}: ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${table}: exists`);
      }
    }

    // 3. 認証テスト
    console.log('\n3️⃣  Testing authentication...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('   ⚠️  Auth check failed:', authError.message);
    } else {
      console.log(`   ✅ Auth working (${users?.length || 0} users)`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Connection test completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Create database tables in Supabase SQL Editor');
    console.log('     (see docs/SYSTEM_DESIGN.md section 4.1)');
    console.log('  2. Run this test again to verify tables are created');
    console.log('');

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
