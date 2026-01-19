import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

async function getAccessToken(): Promise<string> {
  const res = await axios.post(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    app_id: process.env.LARK_APP_ID,
    app_secret: process.env.LARK_APP_SECRET,
  });
  return res.data.tenant_access_token;
}

async function main() {
  const token = await getAccessToken();

  // ファイル一覧で返されるURLを確認
  const folderToken = 'R2oWfpO5wlLEwBd5dMIjGRwvp2g';
  const listRes = await axios.get(
    `${LARK_API_BASE}/drive/v1/files`,
    {
      params: { folder_token: folderToken },
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const files = listRes.data?.data?.files || [];
  const manusFile = files.find((f: any) => f.name.includes('Manus'));

  if (manusFile) {
    console.log('📁 ファイル情報:');
    console.log('   名前:', manusFile.name);
    console.log('   Token:', manusFile.token);
    console.log('   URL（API返却値）:', manusFile.url);

    console.log('\n🔗 試すべきURL:');
    console.log('  ', manusFile.url);
  }
}

main().catch(console.error);
