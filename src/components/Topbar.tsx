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
        <Link href="/add" className="mt-cta">
          ＋ Ajouter
        </Link>
      </div>
    </header>
  );
}
