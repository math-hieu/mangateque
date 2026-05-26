import Link from "next/link";

export function Topbar() {
  return (
    <header className="mx-auto mt-4 max-w-7xl px-4 sm:mt-6 sm:px-8 lg:px-12">
      <div className="flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-surface px-3 py-2.5 sm:gap-4 sm:px-[18px] sm:py-[14px]">
        <Link href="/" className="mt-wordmark text-cream">
          Mangateque
        </Link>
        <div className="hidden h-5 w-px bg-[var(--border-2)] sm:block" />
        <nav className="hidden gap-1 sm:flex">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-2)] px-[11px] py-[7px] text-xs text-cream"
          >
            Bibliothèque
          </Link>
        </nav>
        <span className="flex-1" />
        <Link href="/scan" className="mt-ghost text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          Scanner
        </Link>
        <Link href="/add" className="mt-cta">
          ＋ Ajouter
        </Link>
      </div>
    </header>
  );
}
