import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { StatsCharts } from "@/components/stats-charts";
import { formatCategory, getWarmth } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function StatsPage() {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();

  const [
    { count: totalContacts },
    { count: totalInteractions },
    { data: allContacts },
    { data: recentInteractions },
    { data: topContacts },
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("archived", false),
    supabase.from("interactions").select("*", { count: "exact", head: true }),
    supabase.from("contacts").select("id, category, last_touched_at, created_at").eq("archived", false),
    // Last 6 months of interactions
    supabase
      .from("interactions")
      .select("date")
      .gte("date", subMonths(now, 6).toISOString())
      .order("date", { ascending: true }),
    // Top contacts this month by interaction count
    supabase
      .from("interactions")
      .select("contact_id, contacts(id, name, photo_url)")
      .gte("date", monthStart),
  ]);

  // Category breakdown
  const categoryMap = new Map<string, number>();
  for (const c of allContacts ?? []) {
    const cat = formatCategory(c.category) || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Warmth distribution
  const warmthCounts = { hot: 0, warm: 0, cold: 0 };
  for (const c of allContacts ?? []) {
    warmthCounts[getWarmth(c.last_touched_at, c.created_at)]++;
  }

  // Interactions per month (last 6 months)
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    monthlyMap.set(format(d, "MMM"), 0);
  }
  for (const interaction of recentInteractions ?? []) {
    const key = format(new Date(interaction.date), "MMM");
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
    }
  }
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count }));

  // Top contacts this month
  const contactCounts = new Map<string, { name: string; photo_url: string | null; count: number }>();
  for (const row of topContacts ?? []) {
    const c = row.contacts as unknown as { id: string; name: string; photo_url: string | null } | null;
    if (!c) continue;
    const existing = contactCounts.get(c.id);
    if (existing) {
      existing.count++;
    } else {
      contactCounts.set(c.id, { name: c.name, photo_url: c.photo_url, count: 1 });
    }
  }
  const topContactsList = Array.from(contactCounts.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const avgPerMonth = totalInteractions && totalInteractions > 0
    ? Math.round(totalInteractions / 6)
    : 0;

  return (
    <div className="min-h-screen pb-28">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-4">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold">Network stats</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        {/* Top stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{totalContacts ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Contacts</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{totalInteractions ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">All interactions</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{avgPerMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg / month</p>
          </div>
        </div>

        {/* Warmth distribution */}
        <section>
          <h2 className="mb-3 font-semibold">Network warmth</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">{warmthCounts.hot}</p>
              <p className="text-xs text-orange-400/70 mt-1">🔥 Hot</p>
            </div>
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{warmthCounts.warm}</p>
              <p className="text-xs text-yellow-400/70 mt-1">🌤 Warm</p>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{warmthCounts.cold}</p>
              <p className="text-xs text-blue-400/70 mt-1">❄️ Cold</p>
            </div>
          </div>
        </section>

        {/* Charts (client component) */}
        <StatsCharts categoryData={categoryData} monthlyData={monthlyData} />

        {/* Most engaged this month */}
        {topContactsList.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold">Most engaged this month</h2>
            <div className="space-y-2">
              {topContactsList.map((c, i) => {
                const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <Link
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent/30"
                  >
                    <span className="w-5 text-xs text-muted-foreground text-center">{i + 1}</span>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={c.photo_url ?? undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.count} {c.count === 1 ? "touch" : "touches"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <Nav />
    </div>
  );
}
