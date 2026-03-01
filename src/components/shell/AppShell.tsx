"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bell, LayoutDashboard, Users, Layers, KanbanSquare, Settings, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CommandPalette } from "./CommandPalette";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/projects", label: "Projects", icon: Layers },
  { href: "/app/tasks", label: "Tasks", icon: KanbanSquare },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/admin/users", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const actions = [
    { id: "go-clients", label: "Go to Clients", hint: "Browse client cards", onSelect: () => (window.location.href = "/app/clients") },
    { id: "go-tasks", label: "Go to Tasks", hint: "Kanban + list", onSelect: () => (window.location.href = "/app/tasks") },
    { id: "go-search", label: "Open Search", hint: "Global workspace search", onSelect: () => (window.location.href = "/app/search") },
    { id: "go-notifications", label: "Open Notifications", hint: "Renewals, due dates, inactivity", onSelect: () => (window.location.href = "/app/notifications") },
    {
      id: "export-workspace",
      label: "Export Workspace JSON",
      hint: "Admin-only JSON backup",
      onSelect: () => window.open("/api/export/workspace", "_blank", "noopener,noreferrer"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommandPalette actions={actions} />

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card md:block">
          <div className="px-5 py-4">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground">MTX Ops</div>
            <div className="text-sm font-medium">Operations Console</div>
          </div>
          <Separator />
          <nav className="p-2">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== "/app" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground",
                    active && "bg-secondary text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto p-4 text-xs text-muted-foreground">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="font-medium text-foreground">Tip</div>
              <div className="mt-1">Press <span className="font-mono">Ctrl K</span> to jump anywhere.</div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">MTX Ops</div>
              <div className="hidden text-xs text-muted-foreground md:block">• {pathname?.replace("/app", "") || "Dashboard"}</div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="hidden md:inline-flex" onClick={() => (window.location.href = "/app/notifications")}>
                <Bell className="h-4 w-4" /> Notifications
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm hover:bg-secondary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Account
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => alert("Profile (later)")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
