"use client";

import { ReactNode, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar, SidebarProvider } from "./sidebar";
import { Header } from "./header";

export const AppShell = memo(function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (!user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Chargement…</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header title={title} />
          {/* pb-16 for mobile bottom tabs, lg:pb-0 on desktop */}
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-24 lg:p-6 lg:pb-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
});
