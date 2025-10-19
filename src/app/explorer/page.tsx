import { ExplorerClient } from './ExplorerClient';

export const dynamic = 'force-dynamic';

export default function ExplorerPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 bg-zinc-950 px-4 py-8 text-zinc-100">
      <ExplorerClient />
    </main>
  );
}
