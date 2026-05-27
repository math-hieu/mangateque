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
