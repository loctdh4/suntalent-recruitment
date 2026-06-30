import { LogOut } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentUser } from "@/lib/auth/user";
import { signOut } from "@/lib/auth/actions";

const ROLE_LABEL: Record<string, string> = {
  recruiter: "HR",
  recruiter_intern: "HR intern",
  sales: "Sales",
  sales_intern: "Sale intern",
  admin: "Manager",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const name = user?.profile?.fullName || user?.email || "";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";
  const roleLabel = ROLE_LABEL[user?.role ?? ""] ?? "";

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar role={user?.role} />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-sm sm:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 hidden h-5! sm:block" />
            <span className="truncate text-sm font-semibold tracking-tight">
              SunTalent
              <span className="ml-1 hidden font-normal text-muted-foreground sm:inline">
                · Recruitment CRM
              </span>
            </span>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {user && (
                <div className="flex items-center gap-2.5">
                  <div className="hidden text-right leading-tight sm:block">
                    <p className="max-w-[180px] truncate text-sm font-medium">{name}</p>
                    {roleLabel && (
                      <p className="text-xs text-muted-foreground">{roleLabel}</p>
                    )}
                  </div>
                  <Avatar className="size-8 border">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <Separator orientation="vertical" className="h-5!" />
              <form action={signOut}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="text-muted-foreground hover:text-foreground"
                >
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
