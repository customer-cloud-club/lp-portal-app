/**
 * PortalApp Event型定義
 * UIキットから移植 + LarkBase連携用
 */

export interface PortalEvent {
  id: string;
  title: string;
  description: string;
  speaker: {
    name: string;
    title: string;
    avatar?: string;
    social?: {
      twitter?: string;
      linkedin?: string;
      github?: string;
      website?: string;
    };
  };
  date: string; // ISO 8601
  duration: number; // minutes
  category: string;
  tags: string[];
  thumbnail?: string;
  videoUrl?: string;
  isArchived: boolean;
  attendees?: number;
  rating?: number;
  benefits?: Benefit[];
  surveyUrl?: string;
}

export interface Benefit {
  id: string;
  type: 'url' | 'prompt' | 'text';
  title: string;
  content: string;
  description?: string;
}

export interface EventCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// LarkBaseフィールドマッピング用
export interface LarkBaseEventRecord {
  record_id: string;
  fields: {
    'イベントタイトル'?: string;
    'イベント'?: { text: string }[];
    '告知用文章'?: string;
    'イベント開始日時'?: number;
    'セミナーURL'?: { link?: string; text?: string };
    'YouTube URL'?: string;
    'アーカイブファイルトークン'?: string;
    'archive_file_token'?: string;
    'アーカイブURL'?: string;
    'スピーカー名'?: string;
    'スピーカー肩書'?: string;
    'サムネイルURL'?: string;
    'カテゴリ'?: string;
    'タグ'?: string[];
    '参加者数'?: number;
    '評価'?: number;
  };
}
