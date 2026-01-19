/**
 * Lark Drive API テスト（rootフォルダ）
 */

import 'dotenv/config';
import axios from 'axios';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

async function testLarkDriveRoot() {
  console.log('🔍 Lark Drive APIテスト（rootフォルダ）...\n');

  // Get access token
  const tokenRes = await axios.post(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    app_id: process.env.LARK_APP_ID,
    app_secret: process.env.LARK_APP_SECRET,
  });

  if (tokenRes.data.code !== 0) {
    console.log('❌ Token error:', tokenRes.data);
    return;
  }

  const token = tokenRes.data.tenant_access_token;
  console.log('✅ Access Token取得成功');

  // Test 1: Get root folder meta
  console.log('\n📁 Test 1: ルートフォルダ情報取得...');
  try {
    const rootRes = await axios.get(`${LARK_API_BASE}/drive/v1/files/root_folder_meta`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('✅ ルートフォルダ:', JSON.stringify(rootRes.data, null, 2));
  } catch (e: any) {
    console.log('❌ ルートフォルダエラー:', e.response?.data || e.message);
  }

  // Test 2: Get specified folder meta
  const folderToken = process.env.LARK_DRIVE_FOLDER_ID;
  console.log(`\n📁 Test 2: 指定フォルダ情報取得 (${folderToken})...`);
  try {
    const folderRes = await axios.get(`${LARK_API_BASE}/drive/v1/metas`, {
      params: {
        request_docs: JSON.stringify([{ doc_token: folderToken, doc_type: 'folder' }]),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('✅ フォルダメタ:', JSON.stringify(folderRes.data, null, 2));
  } catch (e: any) {
    console.log('❌ フォルダメタエラー:', e.response?.data || e.message);
  }

  // Test 3: Check app capabilities
  console.log('\n🔑 Test 3: アプリの権限確認...');
  try {
    const appInfoRes = await axios.get(`${LARK_API_BASE}/auth/v3/app_access_token/internal`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('App info response:', JSON.stringify(appInfoRes.data, null, 2));
  } catch (e: any) {
    console.log('App info error:', e.response?.data || e.message);
  }

  // Test 4: Try upload to root folder
  console.log('\n📤 Test 4: ルートフォルダへのテストアップロード...');
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file_name', 'test-upload.txt');
    form.append('parent_type', 'explorer');
    // Use empty string for root folder
    form.append('parent_node', '');
    form.append('size', '10');
    form.append('file', Buffer.from('test data!'), {
      filename: 'test-upload.txt',
      contentType: 'text/plain',
    });

    const uploadRes = await axios.post(
      `${LARK_API_BASE}/drive/v1/files/upload_all`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('✅ アップロード成功:', JSON.stringify(uploadRes.data, null, 2));
  } catch (e: any) {
    console.log('❌ アップロードエラー:');
    console.log('   Code:', e.response?.data?.code);
    console.log('   Message:', e.response?.data?.msg);
  }
}

testLarkDriveRoot().catch(console.error);
