/**
 * LarkBase Client for LP Portal
 * LPテーブルからデータを取得するクライアント
 */

// LPレコードの型定義
export interface LPRecord {
  id: string;
  title: string;
  product: string | null;
  url: string | null;
  status: string | null;
  description: string | null;
  isPublic: boolean;
  repoUrl: string | null;
  priority: string | null;
  taskListUrl: string | null;
  deadline: string | null;
  assignee: string | null;
  createdAt: string | null;
}

// LarkBase設定
const LARKBASE_CONFIG = {
  appToken: process.env.LARKBASE_APP_TOKEN || 'EG7kb49Sqaijy7seo2vjYxIdp3f',
  tableId: process.env.LARKBASE_TABLE_ID || 'tbleuPP6QtZt3Dm8',
  appId: process.env.LARK_APP_ID || '',
  appSecret: process.env.LARK_APP_SECRET || '',
};

// フィールドIDマッピング
const FIELD_MAP = {
  title: 'LPタイトル',        // fld7UBgkaI
  product: 'プロダクト',       // fldpSOE2yF
  url: '公開URL',             // fldpe4GH5K
  status: 'Status',           // fldEsYRWlS
  description: '紹介文',       // fldPf4oTcc
  isPublic: 'ポータルで公開',  // fldPCt8RhZ
  repoUrl: '開発リポジトリパス', // fld6CT85g5
  priority: 'Priority',       // fldFdDurcf
  taskListUrl: 'タスクリスト', // fldSHtyD0b
  deadline: '締切日',         // fldcJnAlU5
  assignee: '担当者',         // fldck1MQlv
  createdAt: '作成日',        // fldeIdyTE8
};

// Tenant Access Token取得
async function getTenantAccessToken(): Promise<string> {
  const response = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: LARKBASE_CONFIG.appId,
      app_secret: LARKBASE_CONFIG.appSecret,
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get tenant access token: ${data.msg}`);
  }
  return data.tenant_access_token;
}

// URLフィールドの値を取得
function getUrlValue(field: any): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.link) return field.link;
  return null;
}

// SingleSelectフィールドの値を取得
function getSelectValue(field: any): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.name) return field.name;
  return null;
}

// LPレコードをパース
function parseRecord(record: any): LPRecord {
  const fields = record.fields || {};

  return {
    id: record.record_id,
    title: fields[FIELD_MAP.title] || '',
    product: getSelectValue(fields[FIELD_MAP.product]),
    url: getUrlValue(fields[FIELD_MAP.url]),
    status: getSelectValue(fields[FIELD_MAP.status]),
    description: fields[FIELD_MAP.description] || null,
    isPublic: fields[FIELD_MAP.isPublic] === true,
    repoUrl: getUrlValue(fields[FIELD_MAP.repoUrl]),
    priority: getSelectValue(fields[FIELD_MAP.priority]),
    taskListUrl: getUrlValue(fields[FIELD_MAP.taskListUrl]),
    deadline: fields[FIELD_MAP.deadline] ? String(fields[FIELD_MAP.deadline]) : null,
    assignee: getSelectValue(fields[FIELD_MAP.assignee]),
    createdAt: fields[FIELD_MAP.createdAt] ? String(fields[FIELD_MAP.createdAt]) : null,
  };
}

// LP一覧を取得
export async function getLPRecords(options?: {
  publicOnly?: boolean;
  pageSize?: number;
}): Promise<LPRecord[]> {
  const { publicOnly = true, pageSize = 100 } = options || {};

  const token = await getTenantAccessToken();

  // フィルター条件を構築
  // チェックボックスフィールドは TRUE ではなく 1 を使用
  let filter = '';
  if (publicOnly) {
    filter = `CurrentValue.[${FIELD_MAP.isPublic}]=1`;
  }

  const url = new URL(`https://open.larksuite.com/open-apis/bitable/v1/apps/${LARKBASE_CONFIG.appToken}/tables/${LARKBASE_CONFIG.tableId}/records`);
  url.searchParams.set('page_size', String(pageSize));
  if (filter) {
    url.searchParams.set('filter', filter);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Failed to get LP records: ${data.msg}`);
  }

  const records = data.data?.items || [];
  return records.map(parseRecord);
}

// 単一のLPレコードを取得
export async function getLPRecord(recordId: string): Promise<LPRecord | null> {
  const token = await getTenantAccessToken();

  const url = `https://open.larksuite.com/open-apis/bitable/v1/apps/${LARKBASE_CONFIG.appToken}/tables/${LARKBASE_CONFIG.tableId}/records/${recordId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (data.code !== 0) {
    if (data.code === 1254043) {
      // Record not found
      return null;
    }
    throw new Error(`Failed to get LP record: ${data.msg}`);
  }

  return parseRecord(data.data?.record);
}
