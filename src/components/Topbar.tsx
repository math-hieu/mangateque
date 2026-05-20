import Link from "next/link";

export function Topbar() {
  return (
    <header className="mx-auto mt-6 max-w-7xl px-12">
      <div className="flex items-center gap-4 rounded-[10px] border border-[var(--border)] bg-surface px-[18px] py-[14px]">
        <Link href="/" className="mt-wordmark text-cream">
          Mangatek
        </Link>
        <div className="h-5 w-px bg-[var(--border-2)]" />
        <nav className="flex gap-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-2)] px-[11px] py-[7px] text-xs text-cream"
          >
            Bibliothèque
          </Link>
        </nav>
        <span className="flex-1" />
        <Link href="/add" className="mt-cta">
          ＋ Ajouter
        </Link>
      </div>
    </header>
  );
}
