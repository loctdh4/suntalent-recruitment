import { LogOut } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentUser } from "@/lib/auth/user";
import { signOut } from "@/lib/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar role={user?.role} />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="flex h-14 items-center gap-2 border-b px-3 sm:px-4">
            <SidebarTrigger />
            <span className="truncate text-sm font-medium text-muted-foreground">
              <span className="hidden sm:inline">SunTalent — Recruitment CRM</span>
              <span className="sm:hidden">SunTalent</span>
            </span>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {user?.email && (
                <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground md:inline">
                  {user.email}
                </span>
              )}
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
              </form>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
