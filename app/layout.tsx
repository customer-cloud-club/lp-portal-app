import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LP Portal - ランディングページ一覧',
  description: 'LarkBaseと連携したLP（ランディングページ）一覧ポータル',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                LP Portal
              </h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              Powered by LarkBase
            </p>
          </div>
        </header>
        <main className="flex-1 p-2 sm:p-3 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
