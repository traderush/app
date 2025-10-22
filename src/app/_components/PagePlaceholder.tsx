export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 p-8 text-center text-zinc-200">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-prose text-sm text-zinc-400">{description}</p>
    </main>
  );
}
