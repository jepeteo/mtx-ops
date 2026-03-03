"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bell,
  LayoutDashboard,
  Users,
  FolderKanban,
  KanbanSquare,
  Search,
  Settings,
  Globe,
  Shield,
  Activity,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mainNav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/providers", label: "Providers", icon: Globe },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/tasks", label: "Tasks", icon: KanbanSquare },
];

const toolsNav = [
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
];

const adminNav = [
  { href: "/app/admin/users", label: "Users", icon: Shield },
  { href: "/app/admin/operations", label: "Operations", icon: Settings },
  { href: "/app/admin/activity", label: "Activity", icon: Activity },
];

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {label}
    </Link>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">
        {label}
      </div>
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname === href || (pathname?.startsWith(href + "/") ?? false);
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const actions = [
    { id: "go-dashboard", label: "Go to Dashboard", hint: "Workspace overview", onSelect: () => (window.location.href = "/app") },
    { id: "go-clients", label: "Go to Clients", hint: "Browse client cards", onSelect: () => (window.location.href = "/app/clients") },
    { id: "go-providers", label: "Open Providers", hint: "Provider catalog across clients", onSelect: () => (window.location.href = "/app/providers") },
    { id: "go-projects", label: "Go to Projects", hint: "Projects and milestones", onSelect: () => (window.location.href = "/app/projects") },
    { id: "go-tasks", label: "Go to Tasks", hint: "Kanban + list", onSelect: () => (window.location.href = "/app/tasks") },
    { id: "go-search", label: "Open Search", hint: "Global workspace search", onSelect: () => (window.location.href = "/app/search") },
    { id: "go-notifications", label: "Open Notifications", hint: "Renewals, due dates, inactivity", onSelect: () => (window.location.href = "/app/notifications") },
    { id: "go-admin-users", label: "Open Admin Users", hint: "Manage workspace users", onSelect: () => (window.location.href = "/app/admin/users") },
    { id: "go-admin-ops", label: "Open Admin Operations", hint: "Cleanup activity and failures", onSelect: () => (window.location.href = "/app/admin/operations") },
    { id: "go-admin-activity", label: "Open Admin Activity", hint: "Audit workflow and filters", onSelect: () => (window.location.href = "/app/admin/activity") },
    {
      id: "export-workspace",
      label: "Export Workspace JSON",
      hint: "Admin-only JSON backup",
      onSelect: () => window.open("/api/export/workspace", "_blank", "noopener,noreferrer"),
    },
  ];

  // Breadcrumb parts from pathname
  const segments = pathname?.replace("/app", "").split("/").filter(Boolean) ?? [];
  const breadcrumb = segments.length > 0
    ? segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    : ["Dashboard"];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <CommandPalette actions={actions} />

      {/* Sidebar */}
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            M
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">MTX Ops</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Operations Console</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          <div className="grid gap-0.5">
            {mainNav.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </div>

          <NavGroup label="Tools">
            {toolsNav.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </NavGroup>

          <NavGroup label="Admin">
            {adminNav.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </NavGroup>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-border p-3">
          <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
            Press <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground">Ctrl K</kbd> to jump anywhere
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/60 px-6 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-sm">
            <Link href="/app" className="text-muted-foreground hover:text-foreground">
              MTX Ops
            </Link>
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                <span className={i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>
                  {part}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/app/notifications"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs font-medium transition-colors hover:bg-secondary">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    U
                  </span>
                  Account
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => alert("Profile (later)")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
