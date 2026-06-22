"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Mail,
  Eye,
  Settings,
  HelpCircle,
  Search,
} from "lucide-react"

import { useSession } from "@/lib/auth-client"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { LogoIcon } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Patente entdecken", url: "/dashboard/patente", icon: Search },
  { title: "Briefings", url: "/dashboard/briefings", icon: Mail },
  { title: "Watchlist", url: "/dashboard/watchlist", icon: Eye },
]

const navSecondary = [
  { title: "Einstellungen", url: "/dashboard/settings", icon: Settings },
  { title: "Hilfe", url: "mailto:support@patentbrief.eu", icon: HelpCircle },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()

  const user = {
    name: session?.user?.name || "Patentbrief",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <LogoIcon size={20} className="shrink-0" />
                <span className="font-serif text-base font-semibold tracking-tight">Patentbrief</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
