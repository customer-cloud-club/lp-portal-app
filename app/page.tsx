import LPList from './components/LPList';

// 動的レンダリングを強制（SSG時のプリレンダリングエラーを回避）
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="h-full">
      <LPList />
    </div>
  );
}
