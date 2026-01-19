-- ============================================================================
-- SkillFreak Streaming System - Database Setup
-- ============================================================================
--
-- このSQLスクリプトをSupabase SQL Editorで実行してください
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
--
-- 実行手順:
-- 1. Supabaseダッシュボードにログイン
-- 2. プロジェクトを選択
-- 3. 左メニュー「SQL Editor」をクリック
-- 4. 「New Query」をクリック
-- 5. このファイルの内容を全てコピー&ペースト
-- 6. 「Run」をクリック
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. archives テーブル（アーカイブ動画情報）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(100),
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    duration INTEGER,
    thumbnail_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'ready',
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_archives_status ON archives(status);
CREATE INDEX IF NOT EXISTS idx_archives_event_date ON archives(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_archives_created_at ON archives(created_at DESC);

COMMENT ON TABLE archives IS 'YouTube動画アーカイブのメタデータ';
COMMENT ON COLUMN archives.video_id IS 'YouTube Video ID (一意)';
COMMENT ON COLUMN archives.status IS 'ready, processing, error';

-- ----------------------------------------------------------------------------
-- 2. download_jobs テーブル（ダウンロードジョブ管理）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS download_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) UNIQUE NOT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    video_id VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    speaker VARCHAR(100),
    event_date TIMESTAMP WITH TIME ZONE,
    lark_record_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON download_jobs(status);
CREATE INDEX IF NOT EXISTS idx_download_jobs_created_at ON download_jobs(created_at DESC);

COMMENT ON TABLE download_jobs IS 'YouTube動画ダウンロードジョブの管理';
COMMENT ON COLUMN download_jobs.status IS 'pending, downloading, uploading, completed, failed';

-- ----------------------------------------------------------------------------
-- 3. playlists テーブル（プレイリスト管理）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    video_order JSONB,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE playlists IS '配信プレイリスト管理';
COMMENT ON COLUMN playlists.video_order IS '動画順序: [{"video_id": "xxx", "position": 1}]';
COMMENT ON COLUMN playlists.is_active IS '現在アクティブなプレイリスト（1つのみtrue）';

-- ----------------------------------------------------------------------------
-- 4. stream_stats テーブル（配信統計）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stream_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewer_count INTEGER DEFAULT 0,
    current_video_id VARCHAR(50),
    bandwidth_used BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stream_stats_timestamp ON stream_stats(timestamp DESC);

COMMENT ON TABLE stream_stats IS 'ストリーム統計（時系列データ）';
COMMENT ON COLUMN stream_stats.bandwidth_used IS '使用帯域（bytes）';

-- ----------------------------------------------------------------------------
-- 5. viewer_sessions テーブル（視聴セッション）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viewer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    videos_watched JSONB,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE viewer_sessions IS 'ユーザー視聴セッション記録';
COMMENT ON COLUMN viewer_sessions.videos_watched IS '視聴動画リスト: [{"video_id": "xxx", "watched_duration": 120}]';
COMMENT ON COLUMN viewer_sessions.duration IS 'セッション時間（秒）';

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) ポリシー設定
-- ----------------------------------------------------------------------------

-- archives: 認証済みユーザーのみ読み取り可
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view archives" ON archives;
CREATE POLICY "Authenticated users can view archives"
ON archives FOR SELECT
TO authenticated
USING (true);

-- download_jobs: 管理者のみアクセス可
ALTER TABLE download_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view download jobs" ON download_jobs;
CREATE POLICY "Admin can view download jobs"
ON download_jobs FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- playlists: 認証済みユーザーは読み取り可、作成者は編集可
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view playlists" ON playlists;
CREATE POLICY "Anyone can view playlists"
ON playlists FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create playlists" ON playlists;
CREATE POLICY "Users can create playlists"
ON playlists FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
CREATE POLICY "Users can update own playlists"
ON playlists FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- stream_stats: 認証済みユーザーは読み取り可
ALTER TABLE stream_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view stats" ON stream_stats;
CREATE POLICY "Authenticated users can view stats"
ON stream_stats FOR SELECT
TO authenticated
USING (true);

-- viewer_sessions: 自分のセッションのみ読み取り可
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON viewer_sessions;
CREATE POLICY "Users can view own sessions"
ON viewer_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own sessions" ON viewer_sessions;
CREATE POLICY "Users can create own sessions"
ON viewer_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 完了メッセージ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - archives';
    RAISE NOTICE '  - download_jobs';
    RAISE NOTICE '  - playlists';
    RAISE NOTICE '  - stream_stats';
    RAISE NOTICE '  - viewer_sessions';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run connection test: npx tsx scripts/test-supabase-connection.ts';
    RAISE NOTICE '  2. Proceed to Phase 1-2: Backblaze B2 setup';
END $$;
