# Stats Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/stats` page with 3 Recharts graphs (reads/month, cumulative spending, purchases/month), backed by a new `read_at` column on the volumes table.

**Architecture:** Server component page fetches stats via a server action, passes pre-computed chart data to a single client component that renders Recharts. The `read_at` timestamptz column tracks when a volume was marked as read; existing read volumes are backfilled with today's date.

**Tech Stack:** Next.js 16 (app router), Supabase (schema `mangateque`), Recharts, Tailwind CSS with custom design tokens (ink/surface/cream/amber).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/types.ts` | Add `read_at` to Volume type |
| Modify | `src/actions/volumes.ts` | Set `read_at` on toggle |
| Create | `src/actions/stats.ts` | Fetch volumes, compute chart data |
| Create | `src/app/stats/page.tsx` | Server component page |
| Create | `src/components/StatsCharts.tsx` | Client component with 3 Recharts charts |
| Modify | `src/components/Topbar.tsx` | Add Stats nav link |

---

### Task 1: Supabase migration — add `read_at` column

**Files:**
- Database: `mangateque.volumes` table

- [ ] **Step 1: Add the column via Supabase SQL editor**

Run this SQL in the Supabase dashboard (SQL Editor):

```sql
ALTER TABLE mangateque.volumes
ADD COLUMN read_at timestamptz;
```

- [ ] **Step 2: Backfill existing read volumes**

```sql
UPDATE mangateque.volumes
SET read_at = NOW()
WHERE is_read = true;
```

- [ ] **Step 3: Verify**

```sql
SELECT id, is_read, read_at FROM mangateque.volumes LIMIT 10;
```

Expected: all rows with `is_read = true` have a `read_at` value; rows with `is_read = false` have `read_at = null`.

---

### Task 2: Update Volume type

**Files:**
- Modify: `src/lib/types.ts:14-21`

- [ ] **Step 1: Add `read_at` field to the Volume type**

In `src/lib/types.ts`, add `read_at: string | null` to the `Volume` type after `is_read`:

```typescript
export type Volume = {
  id: string;
  series_id: string;
  number: number;
  price: number;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (existing code doesn't reference `read_at` yet, so it's additive)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(stats): add read_at field to Volume type"
```

---

### Task 3: Update toggleVolumeRead to set read_at

**Files:**
- Modify: `src/actions/volumes.ts:29-39`

- [ ] **Step 1: Modify the update call to include read_at**

Replace the `toggleVolumeRead` function in `src/actions/volumes.ts`:

```typescript
export async function toggleVolumeRead(volumeId: string, isRead: boolean) {
  const { data, error } = await supabase()
    .from("volumes")
    .update({
      is_read: isRead,
      read_at: isRead ? new Date().toISOString() : null,
    })
    .eq("id", volumeId)
    .select("series_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/series/${data.series_id}`);
  revalidatePath("/");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/actions/volumes.ts
git commit -m "feat(stats): set read_at timestamp when toggling volume read status"
```

---

### Task 4: Install Recharts

- [ ] **Step 1: Install the dependency**

```bash
npm install recharts
```

- [ ] **Step 2: Verify installation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts dependency"
```

---

### Task 5: Create getReadingStats server action

**Files:**
- Create: `src/actions/stats.ts`

- [ ] **Step 1: Create the stats action file**

Create `src/actions/stats.ts`:

```typescript
"use server";

import { supabase } from "@/lib/supabase";

export type MonthlyCount = { month: string; count: number };
export type CumulativeSpend = { month: string; total: number };

export type ReadingStats = {
  readPerMonth: MonthlyCount[];
  cumulativeSpend: CumulativeSpend[];
  purchasesPerMonth: MonthlyCount[];
};

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

export async function getReadingStats(): Promise<ReadingStats> {
  const { data: volumes, error } = await supabase()
    .from("volumes")
    .select("created_at, price, read_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const readCounts = new Map<string, number>();
  const purchaseCounts = new Map<string, number>();
  const spendByMonth = new Map<string, number>();

  for (const v of volumes ?? []) {
    const purchaseKey = toMonthKey(v.created_at);
    purchaseCounts.set(purchaseKey, (purchaseCounts.get(purchaseKey) ?? 0) + 1);
    spendByMonth.set(purchaseKey, (spendByMonth.get(purchaseKey) ?? 0) + v.price);

    if (v.read_at) {
      const readKey = toMonthKey(v.read_at);
      readCounts.set(readKey, (readCounts.get(readKey) ?? 0) + 1);
    }
  }

  const readPerMonth: MonthlyCount[] = [...readCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ month: formatMonthLabel(key), count }));

  const purchasesPerMonth: MonthlyCount[] = [...purchaseCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ month: formatMonthLabel(key), count }));

  let runningTotal = 0;
  const cumulativeSpend: CumulativeSpend[] = [...spendByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => {
      runningTotal += amount;
      return { month: formatMonthLabel(key), total: parseFloat(runningTotal.toFixed(2)) };
    });

  return { readPerMonth, cumulativeSpend, purchasesPerMonth };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/actions/stats.ts
git commit -m "feat(stats): add getReadingStats server action"
```

---

### Task 6: Create StatsCharts client component

**Files:**
- Create: `src/components/StatsCharts.tsx`

- [ ] **Step 1: Create the client component with 3 charts**

Create `src/components/StatsCharts.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyCount, CumulativeSpend } from "@/actions/stats";

const AMBER = "#e8a14a";
const AMBER_SOFT = "rgba(232, 161, 74, 0.14)";
const MUTED = "#8a7e6a";
const SURFACE_2 = "#2f271f";

const axisProps = {
  tick: { fill: MUTED, fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-[var(--border)] bg-surface p-4 sm:p-6">
      <h2 className="mt-label mb-4">{title}</h2>
      <div className="h-[220px] sm:h-[280px]">
        {children}
      </div>
    </section>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border-2)] bg-surface-2 px-3 py-2 text-xs text-cream shadow-lg">
      <p className="text-cream-mute">{label}</p>
      <p className="mt-tabular font-medium">{payload[0].value}</p>
    </div>
  );
}

function SpendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border-2)] bg-surface-2 px-3 py-2 text-xs text-cream shadow-lg">
      <p className="text-cream-mute">{label}</p>
      <p className="mt-tabular font-medium">{payload[0].value.toFixed(2).replace(".", ",")} €</p>
    </div>
  );
}

export function StatsCharts({
  readPerMonth,
  cumulativeSpend,
  purchasesPerMonth,
}: {
  readPerMonth: MonthlyCount[];
  cumulativeSpend: CumulativeSpend[];
  purchasesPerMonth: MonthlyCount[];
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <ChartSection title="Lectures par mois">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={readPerMonth}>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={30} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: SURFACE_2 }} />
            <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Dépenses cumulées">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cumulativeSpend}>
            <defs>
              <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AMBER} stopOpacity={0.3} />
                <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={50} tickFormatter={(v: number) => `${v} €`} />
            <Tooltip content={<SpendTooltip />} cursor={{ stroke: MUTED, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={AMBER}
              strokeWidth={2}
              fill="url(#amberGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Achats par mois">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={purchasesPerMonth}>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={30} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: SURFACE_2 }} />
            <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/StatsCharts.tsx
git commit -m "feat(stats): add StatsCharts client component with Recharts"
```

---

### Task 7: Create /stats page

**Files:**
- Create: `src/app/stats/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/stats/page.tsx`:

```tsx
import { getReadingStats } from "@/actions/stats";
import { StatsCharts } from "@/components/StatsCharts";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getReadingStats();

  return (
    <div className="mb-8">
      <StatsCharts
        readPerMonth={stats.readPerMonth}
        cumulativeSpend={stats.cumulativeSpend}
        purchasesPerMonth={stats.purchasesPerMonth}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/stats/page.tsx
git commit -m "feat(stats): add /stats page"
```

---

### Task 8: Add Stats link to Topbar

**Files:**
- Modify: `src/components/Topbar.tsx:11-18`

- [ ] **Step 1: Add the Stats link in the nav**

In `src/components/Topbar.tsx`, add a "Stats" link inside the `<nav>` element, after the existing "Bibliothèque" link:

```tsx
<nav className="hidden gap-1 sm:flex">
  <Link
    href="/"
    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-2)] px-[11px] py-[7px] text-xs text-cream"
  >
    Bibliothèque
  </Link>
  <Link
    href="/stats"
    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-2)] px-[11px] py-[7px] text-xs text-cream"
  >
    Stats
  </Link>
</nav>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Topbar.tsx
git commit -m "feat(stats): add Stats link to Topbar navigation"
```

---

### Task 9: Visual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test the Stats page**

Open `http://localhost:3000/stats` in a browser. Verify:
- 3 charts render correctly, stacked vertically
- Amber color scheme is consistent
- Charts are responsive (resize browser to mobile width)
- Tooltips display on hover

- [ ] **Step 3: Test mark-as-read still works**

Go to a series detail page, toggle a volume read/unread. Verify:
- The toggle still works
- Refreshing `/stats` reflects the change

- [ ] **Step 4: Test Topbar link**

Click "Stats" in the Topbar. Verify it navigates to `/stats`.
