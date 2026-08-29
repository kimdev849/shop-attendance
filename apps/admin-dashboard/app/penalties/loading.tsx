import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function PenaltiesLoading() {
  return (
    <AppShell title="Pénalités">
      <PageLoadingSkeleton title="Pénalités" />
    </AppShell>
  );
}
