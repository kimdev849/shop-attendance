import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function AbsencesLoading() {
  return (
    <AppShell title="Absences">
      <PageLoadingSkeleton title="Absences" />
    </AppShell>
  );
}
