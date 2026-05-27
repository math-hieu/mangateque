import { getReadingStats } from "@/actions/stats";
import { StatsCharts } from "@/components/StatsCharts";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getReadingStats();

  return (
    <div className="mb-8">
      <StatsCharts
        readPerWeek={stats.readPerWeek}
        readPerMonth={stats.readPerMonth}
        spendPerMonth={stats.spendPerMonth}
        purchasesPerMonth={stats.purchasesPerMonth}
      />
    </div>
  );
}
