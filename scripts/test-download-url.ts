/**
 * Lark Drive ダウンロードURLテスト
 */

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';
const fileToken = 'UPgUbQyXUolTIGxbxkvjvM4Sp3b';

async function getAccessToken(): Promise<string> {
  const res = await axios.post(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    app_id: process.env.LARK_APP_ID,
    app_secret: process.env.LARK_APP_SECRET,
  });
  return res.data.tenant_access_token;
}

async function main() {
  const token = await getAccessToken();
  console.log('Access Token:', token.substring(0, 20) + '...');

  // 方法1: /medias/{fileToken}/download
  console.log('\n方法1: /drive/v1/medias/{fileToken}/download');
  try {
    const res1 = await axios.get(
      `${LARK_API_BASE}/drive/v1/medias/${fileToken}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );
    console.log('Status:', res1.status);
    console.log('Headers:', res1.headers);
    if (res1.headers.location) {
      console.log('Download URL:', res1.headers.location.substring(0, 100) + '...');
    }
  } catch (error: any) {
    console.log('Error:', error.message);
  }

  // 方法2: batch_get_tmp_download_url
  console.log('\n方法2: /drive/v1/medias/batch_get_tmp_download_url');
  try {
    const res2 = await axios.get(
      `${LARK_API_BASE}/drive/v1/medias/batch_get_tmp_download_url`,
      {
        params: { file_tokens: fileToken },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('Response:', JSON.stringify(res2.data, null, 2));
  } catch (error: any) {
    console.log('Error:', error.response?.data || error.message);
  }

  // 方法3: /files/{fileToken}/download
  console.log('\n方法3: /drive/v1/files/{fileToken}/download');
  try {
    const res3 = await axios.get(
      `${LARK_API_BASE}/drive/v1/files/${fileToken}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );
    console.log('Status:', res3.status);
    if (res3.headers.location) {
      console.log('Download URL:', res3.headers.location.substring(0, 100) + '...');
    } else if (res3.data) {
      console.log('Response:', typeof res3.data === 'string' ? res3.data.substring(0, 200) : JSON.stringify(res3.data, null, 2));
    }
  } catch (error: any) {
    console.log('Error:', error.response?.data || error.message);
  }
}

main().catch(console.error);
