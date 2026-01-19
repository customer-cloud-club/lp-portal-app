-- SkillFreak Streaming System Schema
-- 24時間アーカイブ配信システム用データベース

-- archives テーブル: アーカイブ動画情報
CREATE TABLE IF NOT EXISTS public.archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(100),
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    duration INTEGER, -- 秒
    thumbnail_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'ready', -- ready, processing, error
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- download_jobs テーブル: ダウンロードジョブ管理
CREATE TABLE IF NOT EXISTS public.download_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) UNIQUE NOT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    video_id VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    speaker VARCHAR(100),
    event_date TIMESTAMP WITH TIME ZONE,
    lark_record_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- pending, downloading, uploading, completed, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- playlists テーブル: プレイリスト管理
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    video_order JSONB, -- [{"video_id": "xxx", "position": 1}, ...]
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- stream_stats テーブル: 配信統計
CREATE TABLE IF NOT EXISTS public.stream_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewer_count INTEGER DEFAULT 0,
    current_video_id VARCHAR(50),
    bandwidth_used BIGINT, -- bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- viewer_sessions テーブル: 視聴セッション
CREATE TABLE IF NOT EXISTS public.viewer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 秒
    videos_watched JSONB, -- [{"video_id": "xxx", "watched_duration": 120}, ...]
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_archives_status ON public.archives(status);
CREATE INDEX IF NOT EXISTS idx_archives_event_date ON public.archives(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_archives_created_at ON public.archives(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archives_video_id ON public.archives(video_id);

CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON public.download_jobs(status);
CREATE INDEX IF NOT EXISTS idx_download_jobs_created_at ON public.download_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_jobs_job_id ON public.download_jobs(job_id);

CREATE INDEX IF NOT EXISTS idx_playlists_is_active ON public.playlists(is_active);
CREATE INDEX IF NOT EXISTS idx_playlists_created_by ON public.playlists(created_by);

CREATE INDEX IF NOT EXISTS idx_stream_stats_timestamp ON public.stream_stats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stream_stats_current_video_id ON public.stream_stats(current_video_id);

CREATE INDEX IF NOT EXISTS idx_viewer_sessions_user_id ON public.viewer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_session_start ON public.viewer_sessions(session_start DESC);

-- updated_at 自動更新トリガー
CREATE TRIGGER update_archives_updated_at BEFORE UPDATE ON public.archives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_download_jobs_updated_at BEFORE UPDATE ON public.download_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 設定
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewer_sessions ENABLE ROW LEVEL SECURITY;

-- archives: 認証済みユーザーのみ読み取り可
CREATE POLICY "Authenticated users can view archives"
    ON public.archives FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage archives"
    ON public.archives FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- download_jobs: 管理者のみアクセス可
CREATE POLICY "Admin can view download jobs"
    ON public.download_jobs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin can manage download jobs"
    ON public.download_jobs FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- playlists: 管理者のみ編集可、全員閲覧可
CREATE POLICY "Authenticated users can view playlists"
    ON public.playlists FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage playlists"
    ON public.playlists FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- stream_stats: 認証済みユーザーは閲覧可
CREATE POLICY "Authenticated users can view stream stats"
    ON public.stream_stats FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System can insert stream stats"
    ON public.stream_stats FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- viewer_sessions: ユーザーは自分のセッションのみ閲覧可
CREATE POLICY "Users can view own sessions"
    ON public.viewer_sessions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions"
    ON public.viewer_sessions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
    ON public.viewer_sessions FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admin can view all sessions"
    ON public.viewer_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
