import { Badge } from "./badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  ON_TIME: { label: "À l'heure", variant: "success" },
  LATE: { label: "En retard", variant: "warning" },
  ABSENT: { label: "Absent", variant: "destructive" },
  PENDING: { label: "En attente", variant: "warning" },
  APPROVED: { label: "Approuvée", variant: "success" },
  VALIDATED: { label: "Validée", variant: "success" },
  REJECTED: { label: "Rejetée", variant: "destructive" },
  CANCELLED: { label: "Annulée", variant: "secondary" },
  ACTIVE: { label: "Actif", variant: "success" },
  INACTIVE: { label: "Inactif", variant: "secondary" },
  SUSPENDED: { label: "Suspendu", variant: "destructive" },
  ONLINE: { label: "En ligne", variant: "success" },
  OFFLINE: { label: "Hors ligne", variant: "secondary" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
