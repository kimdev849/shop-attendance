import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function ReportsLoading() {
  return (
    <AppShell title="Rapports">
      <PageLoadingSkeleton title="Rapports" />
    </AppShell>
  );
}
