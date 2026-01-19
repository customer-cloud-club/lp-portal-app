'use client';

import { useState } from 'react';
import type { LPRecord } from '@/lib/larkbase-client';

interface LPSidebarCardProps {
  lp: LPRecord;
  isSelected: boolean;
  onClick: () => void;
}

export default function LPSidebarCard({ lp, isSelected, onClick }: LPSidebarCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // サムネイル用のスクリーンショットサービスURL
  // 無料のスクリーンショットAPIを使用
  const thumbnailUrl = lp.url
    ? `https://api.microlink.io/?url=${encodeURIComponent(lp.url)}&screenshot=true&meta=false&embed=screenshot.url`
    : null;

  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer rounded-md overflow-hidden border transition-all duration-150
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* サムネイル - コンパクト */}
      <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {lp.url && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-600" />
              </div>
            )}
            <img
              src={thumbnailUrl || ''}
              alt={`${lp.title}のプレビュー`}
              className={`w-full h-full object-cover object-top transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* 選択インジケーター */}
        {isSelected && (
          <div className="absolute top-1 right-1">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* タイトル - コンパクト */}
      <div className="px-2 py-1.5">
        <h4 className={`text-xs font-medium line-clamp-2 leading-tight ${
          isSelected
            ? 'text-blue-900 dark:text-blue-100'
            : 'text-gray-700 dark:text-gray-200'
        }`}>
          {lp.title || '無題のLP'}
        </h4>
      </div>
    </div>
  );
}
