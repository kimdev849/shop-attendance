import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function DevicesLoading() {
  return (
    <AppShell title="Appareils">
      <PageLoadingSkeleton title="Appareils" />
    </AppShell>
  );
}
