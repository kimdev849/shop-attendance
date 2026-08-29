import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function WorkersLoading() {
  return (
    <AppShell title="Travailleurs">
      <PageLoadingSkeleton title="Travailleurs" />
    </AppShell>
  );
}
