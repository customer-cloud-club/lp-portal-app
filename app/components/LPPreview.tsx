'use client';

import { useState } from 'react';
import type { LPRecord } from '@/lib/larkbase-client';

interface LPPreviewProps {
  lp: LPRecord;
}

export default function LPPreview({ lp }: LPPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // URLがない場合はプレースホルダーを表示
  if (!lp.url) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {lp.title || '無題のLP'}
          </h2>
          {lp.description && (
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {lp.description}
            </p>
          )}
        </div>
        <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p>公開URLが設定されていません</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* コンパクトヘッダー */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
            {lp.title || '無題のLP'}
          </h2>
          {lp.status && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex-shrink-0">
              {lp.status}
            </span>
          )}
        </div>
        <a
          href={lp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-2 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-md transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="hidden sm:inline">開く</span>
        </a>
      </div>

      {/* プレビューエリア - 最大化 */}
      <div className="relative flex-1 min-h-0">
        {/* ローディング表示 */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {hasError && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center z-10">
            <div className="text-center text-gray-500 dark:text-gray-400 p-4">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mb-3 text-sm">プレビューを読み込めませんでした</p>
              <a
                href={lp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                直接開く
              </a>
            </div>
          </div>
        )}

        {/* iframeプレビュー */}
        <iframe
          src={lp.url}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={`${lp.title}のプレビュー`}
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
