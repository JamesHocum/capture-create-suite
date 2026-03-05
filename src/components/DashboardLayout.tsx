import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useAuth } from "@/hooks/useAuth";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  useOfflineCache(user?.id);

  return (
    <div className="dark">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <OfflineBanner />
            <header className="h-14 flex items-center border-b border-border/50 px-4">
              <SidebarTrigger className="text-muted-foreground" />
            </header>
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
