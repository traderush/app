import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-100">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">TradeRush</h1>
        <div className="flex gap-3">
          <a href="/box-hit" className="px-4 py-2 rounded-xl bg-zinc-800">Box Hit</a>
          <a href="/sketch"   className="px-4 py-2 rounded-xl bg-zinc-800">Sketch</a>
          <a href="/towers"   className="px-4 py-2 rounded-xl bg-zinc-800">Towers</a>
          <a href="/ahead"    className="px-4 py-2 rounded-xl bg-zinc-800">Ahead</a>
        </div>
      </div>
    </main>
  );
}
