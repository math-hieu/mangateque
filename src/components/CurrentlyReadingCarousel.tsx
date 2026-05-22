"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Cover } from "./Cover";
import { toggleVolumeRead } from "@/actions/volumes";
import type { ReadingItem } from "@/lib/types";

type Props = { items: ReadingItem[] };

export function CurrentlyReadingCarousel({ items }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  function scrollByCards(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    const step = first ? first.offsetWidth + 14 : 300;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <section aria-labelledby="reading-heading" className="mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-0.5">
        <h2
          id="reading-heading"
          className="m-0 flex items-baseline gap-2.5 text-[15px] font-medium tracking-tight text-cream"
        >
          <span>Lecture en cours</span>
          <span className="mt-mono text-[11px] text-muted" style={{ letterSpacing: "0.06em" }}>
            {items.length}&nbsp;{items.length > 1 ? "SÉRIES" : "SÉRIE"}
          </span>
        </h2>

        <div className="hidden gap-1.5 sm:flex">
          <NavButton label="Précédent" onClick={() => scrollByCards(-1)}>
            <path d="M7.5 2.5 4 6l3.5 3.5" />
          </NavButton>
          <NavButton label="Suivant" onClick={() => scrollByCards(1)}>
            <path d="M4.5 2.5 8 6l-3.5 3.5" />
          </NavButton>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-0.5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingInline: 2 }}
      >
        {items.map((item) => (
          <ReadingCard key={item.series.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ReadingCard({ item }: { item: ReadingItem }) {
  const { series, owned_count, read_count, next_volume } = item;
  const pct = owned_count > 0 ? Math.round((read_count / owned_count) * 100) : 0;
  const tickCount = owned_count > 1 && owned_count <= 14 ? owned_count - 1 : 0;
  const numStr = String(next_volume.number).padStart(2, "0");

  const [pending, start] = useTransition();

  function markNextRead() {
    start(async () => {
      try {
        await toggleVolumeRead(next_volume.id, true);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur");
      }
    });
  }

  return (
    <article
      data-card
      className="grid min-h-[152px] w-full shrink-0 snap-start basis-full overflow-hidden rounded-[10px] border border-[var(--border-2)] bg-surface sm:w-auto sm:basis-[46%] md:basis-[31%] lg:basis-[32%]"
      style={{ gridTemplateColumns: "92px 1fr" }}
    >
      <Link href={`/series/${series.id}`} className="relative block border-r border-[var(--border)]">
        <div className="h-full w-full" style={{ aspectRatio: "0.71" }}>
          <Cover
            url={series.cover_url}
            seedKey={series.id}
            title={series.title}
            publisher={series.publisher}
          />
        </div>

        <div
          aria-hidden
          className="mt-mono absolute -top-1.5 left-3.5 w-[26px] text-center text-[11px] font-semibold leading-none"
          style={{
            background: "var(--amber)",
            color: "#1a1208",
            letterSpacing: "0.02em",
            padding: "8px 0 12px",
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
            boxShadow: "0 4px 10px -4px rgba(0,0,0,0.45)",
          }}
        >
          <span className="mb-0.5 block text-[8px] opacity-75" style={{ letterSpacing: "0.08em" }}>
            T.
          </span>
          {numStr}
        </div>
      </Link>

      <div className="flex min-w-0 flex-col gap-2 px-3.5 py-3">
        <h3 className="truncate text-[14px] font-medium tracking-tight text-cream">
          <Link href={`/series/${series.id}`} className="hover:text-amber">{series.title}</Link>
        </h3>

        <span className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
          {series.publisher.toUpperCase()}
          {series.edition_variant ? ` · ${series.edition_variant.toUpperCase()}` : ""}
        </span>

        <div className="mt-auto flex flex-col gap-1.5 pt-1.5">
          <div
            role="progressbar"
            aria-valuenow={read_count}
            aria-valuemin={0}
            aria-valuemax={owned_count}
            aria-label={`${read_count} tomes lus sur ${owned_count}`}
            className="relative h-1 overflow-hidden rounded-[2px] bg-ink-2"
          >
            <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
            {tickCount > 0 && (
              <div className="pointer-events-none absolute inset-0 flex justify-between">
                {Array.from({ length: tickCount }).map((_, i) => (
                  <span key={i} className="h-full w-px" style={{ background: "var(--border-2)" }} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-mono flex justify-between text-[10px] text-cream-mute" style={{ letterSpacing: "0.04em" }}>
            <span>
              <span className="text-amber">{read_count}</span> / {owned_count} lus
            </span>
            <span>Prochain · t. {numStr}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={markNextRead}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border-3)] bg-transparent px-2.5 py-1.5 text-[12px] text-cream transition-colors hover:bg-[rgba(236,228,211,0.04)] disabled:opacity-50"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M3 7h10M9 3l4 4-4 4" />
          </svg>
          {pending ? "Marquage…" : `Marquer le tome ${numStr} lu`}
        </button>
      </div>
    </article>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[var(--border-2)] bg-transparent text-cream-mute transition-colors hover:bg-[rgba(236,228,211,0.04)] hover:text-cream"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
