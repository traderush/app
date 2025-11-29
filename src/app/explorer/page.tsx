import { ExplorerClient } from './ExplorerClient';

export const dynamic = 'force-dynamic';

export default function ExplorerPage() {
  return (
    <div className="min-h-full relative flex text-white gap-3 p-3" style={{ backgroundColor: '#000000' }}>
      <div className="flex flex-1 flex-col rounded-md border border-zinc-800 p-4" style={{ backgroundColor: '#0D0D0D' }}>
      <ExplorerClient />
      </div>
    </div>
  );
}
