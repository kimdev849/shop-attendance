"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar, SidebarProvider } from "./sidebar";
import { Header } from "./header";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title={title} />
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
