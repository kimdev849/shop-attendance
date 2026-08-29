import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function UsersLoading() {
  return (
    <AppShell title="Utilisateurs">
      <PageLoadingSkeleton title="Utilisateurs" />
    </AppShell>
  );
}
