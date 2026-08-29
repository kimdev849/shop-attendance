import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function AuditLoading() {
  return (
    <AppShell title="Historique">
      <PageLoadingSkeleton title="Historique" />
    </AppShell>
  );
}
