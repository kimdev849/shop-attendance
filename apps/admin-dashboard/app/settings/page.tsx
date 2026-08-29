"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatFcfa } from "@/lib/utils";

interface PenaltyRule {
  id: string;
  fromMinutes: number;
  toMinutes: number | null;
  amount: number;
  isActive: boolean;
}

export default function SettingsPage() {
  const [rules, setRules] = useState<PenaltyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState({ fromMinutes: "", toMinutes: "", amount: "" });
  const [deleteTarget, setDeleteTarget] = useState<PenaltyRule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const { data } = await api.penaltyRules.list();
    setRules(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    try {
      await api.penaltyRules.create({
        fromMinutes: Number(newRule.fromMinutes),
        toMinutes: newRule.toMinutes ? Number(newRule.toMinutes) : undefined,
        amount: Number(newRule.amount),
      });
      toast("Palier de pénalité ajouté.", "success");
      setNewRule({ fromMinutes: "", toMinutes: "", amount: "" });
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    }
  }

  async function handleRemove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.penaltyRules.remove(deleteTarget.id);
      toast("Palier supprimé.", "success");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell title="Paramètres">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" /> Paliers de pénalité (retard retenu → montant)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Le "retard retenu" est le retard réel moins la tolérance configurée sur l'horaire du
            travailleur. Ces paliers déterminent le montant de la pénalité proposée à validation.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={4} columns={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De (min)</TableHead>
                  <TableHead>À (min)</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules
                  .filter((r) => r.isActive)
                  .map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.fromMinutes}</TableCell>
                      <TableCell>{rule.toMinutes ?? "∞"}</TableCell>
                      <TableCell className="font-medium">{formatFcfa(rule.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(rule)} title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          <div className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>De (min)</Label>
              <Input
                type="number"
                value={newRule.fromMinutes}
                onChange={(e) => setNewRule({ ...newRule, fromMinutes: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>À (min, vide = illimité)</Label>
              <Input
                type="number"
                value={newRule.toMinutes}
                onChange={(e) => setNewRule({ ...newRule, toMinutes: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Montant (FCFA)</Label>
              <Input
                type="number"
                value={newRule.amount}
                onChange={(e) => setNewRule({ ...newRule, amount: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAdd}
                disabled={!newRule.fromMinutes || !newRule.amount}
                className="w-full"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleRemove}
        loading={deleting}
        title="Supprimer le palier"
        message={`Êtes-vous sûr de vouloir supprimer le palier ${deleteTarget?.fromMinutes}–${deleteTarget?.toMinutes ?? "∞"} min (${formatFcfa(deleteTarget?.amount ?? 0)}) ?`}
        confirmLabel="Supprimer"
        variant="destructive"
      />
    </AppShell>
  );
}
