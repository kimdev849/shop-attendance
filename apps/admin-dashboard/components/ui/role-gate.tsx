"use client";

import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

interface RoleGateProps {
  /** Rôles autorisés à voir le contenu. */
  allowed: ("ADMIN" | "SHOP_MANAGER" | "WORKER")[];
  children: ReactNode;
  /** Contenu affiché si le rôle n'est pas autorisé (rien par défaut). */
  fallback?: ReactNode;
}

/**
 * Affiche conditionnellement du contenu en fonction du rôle de l'utilisateur
 * connecté. Ne remplace PAS les guards backend — c'est uniquement de l'UX.
 *
 * @example
 * <RoleGate allowed={["ADMIN"]}>
 *   <Button>Supprimer</Button>
 * </RoleGate>
 */
export function RoleGate({ allowed, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
