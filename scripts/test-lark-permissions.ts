/**
 * Lark API権限テストスクリプト
 */

import 'dotenv/config';
import axios from 'axios';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

async function testLarkPermissions() {
  // Get access token
  const tokenRes = await axios.post(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    app_id: process.env.LARK_APP_ID,
    app_secret: process.env.LARK_APP_SECRET,
  });

  if (tokenRes.data.code !== 0) {
    console.log('Token error:', tokenRes.data);
    return;
  }

  const token = tokenRes.data.tenant_access_token;
  console.log('✅ Access Token取得成功');

  // Try to list files in folder
  const folderToken = process.env.LARK_DRIVE_FOLDER_ID;
  console.log('📁 Folder Token:', folderToken);

  try {
    const listRes = await axios.get(`${LARK_API_BASE}/drive/v1/files`, {
      params: {
        folder_token: folderToken,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('📂 フォルダ一覧取得成功');
    console.log('   ファイル数:', listRes.data.data?.files?.length || 0);

    // Show first few files
    const files = listRes.data.data?.files || [];
    files.slice(0, 5).forEach((f: any) => {
      console.log(`   - ${f.name} (${f.type})`);
    });
  } catch (e: any) {
    console.log('❌ フォルダ一覧エラー:', e.response?.data || e.message);
  }

  // Test small file upload (1KB test)
  console.log('\n📤 小ファイルアップロードテスト...');
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file_name', 'test.txt');
    form.append('parent_type', 'explorer');
    form.append('parent_node', folderToken);
    form.append('size', '10');
    form.append('file', Buffer.from('test data!'), {
      filename: 'test.txt',
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

    console.log('✅ 小ファイルアップロード成功');
    console.log('   File Token:', uploadRes.data.data?.file_token);
  } catch (e: any) {
    console.log('❌ アップロードエラー:');
    console.log('   Code:', e.response?.data?.code);
    console.log('   Message:', e.response?.data?.msg);
    console.log('   Full:', JSON.stringify(e.response?.data, null, 2));
  }
}

testLarkPermissions().catch(console.error);
