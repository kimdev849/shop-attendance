import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function AttendanceLoading() {
  return (
    <AppShell title="Pointages">
      <PageLoadingSkeleton title="Pointages" />
    </AppShell>
  );
}
