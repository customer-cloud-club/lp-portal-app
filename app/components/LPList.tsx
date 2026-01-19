'use client';

import { useEffect, useState } from 'react';
import type { LPRecord } from '@/lib/larkbase-client';
import LPPreview from './LPPreview';
import LPSidebarCard from './LPSidebarCard';

export default function LPList() {
  const [lpRecords, setLpRecords] = useState<LPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLP, setSelectedLP] = useState<LPRecord | null>(null);

  useEffect(() => {
    async function fetchLPRecords() {
      try {
        setLoading(true);
        const response = await fetch('/api/lp');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch LP records');
        }

        setLpRecords(data.data);
        // 最初のLPをデフォルトで選択
        if (data.data.length > 0) {
          setSelectedLP(data.data[0]);
        }
      } catch (err: any) {
        console.error('Error fetching LP records:', err);
        setError(err.message || 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    }

    fetchLPRecords();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">エラーが発生しました</h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (lpRecords.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">LPが見つかりません</h3>
        <p className="text-gray-500 dark:text-gray-400">公開されているLPはまだありません</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
      {/* メインプレビューエリア */}
      <div className="flex-1 min-w-0">
        {selectedLP && <LPPreview lp={selectedLP} />}
      </div>

      {/* サイドバー */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        {/* ヘッダー */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            LP一覧
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lpRecords.length}件
          </p>
        </div>

        {/* スクロール可能なカードリスト */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {lpRecords.map((lp) => (
            <LPSidebarCard
              key={lp.id}
              lp={lp}
              isSelected={selectedLP?.id === lp.id}
              onClick={() => setSelectedLP(lp)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
