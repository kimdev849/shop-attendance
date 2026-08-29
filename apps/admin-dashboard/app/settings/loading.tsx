import { AppShell } from "@/components/layout/shell";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function SettingsLoading() {
  return (
    <AppShell title="Paramètres">
      <PageLoadingSkeleton title="Paramètres" />
    </AppShell>
  );
}
