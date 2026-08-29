import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function ShopsLoading() {
  return (
    <AppShell title="Shops">
      <PageLoadingSkeleton title="Shops" />
    </AppShell>
  );
}
