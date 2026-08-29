import { AppShell } from "@/components/layout/shell";

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-muted-foreground/10" />
                <div className="h-6 w-12 rounded bg-muted-foreground/15" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted-foreground/10" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-border bg-card" />
        <div className="h-64 rounded-xl border border-border bg-card" />
      </div>
      <div className="h-48 rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <AppShell title="Tableau de bord">
      <DashboardLoadingSkeleton />
    </AppShell>
  );
}
