"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  CalendarClock,
  LayoutDashboard,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const nav: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}[] = [
  {
    href: "/overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  { href: "/jobs", label: "Jobs tuyển dụng", icon: Briefcase },
  { href: "/interviews", label: "Lịch phỏng vấn", icon: CalendarClock },
  { href: "/candidates", label: "Ứng viên", icon: Users },

  {
    href: "/clients",
    label: "Đối tác",
    icon: Building2,
    roles: ["sales", "sales_intern", "admin"],
  },
  {
    href: "/industries",
    label: "Danh mục ngành",
    icon: Tags,
    roles: ["admin"],
  },
  { href: "/team", label: "Quản lý team", icon: UserCog, roles: ["admin"] },
];

export function AppSidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const items = nav.filter(
    (item) => !item.roles || (role ? item.roles.includes(role) : false),
  );
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center px-2 py-2">
          <Image
            src="/logo.png"
            alt="SunTalent"
            width={160}
            height={160}
            priority
            className="h-14 w-auto"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-4">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
