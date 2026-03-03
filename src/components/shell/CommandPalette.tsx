"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type Action = {
  id: string;
  label: string;
  hint?: string;
  onSelect: () => void;
};

export function CommandPalette({ actions }: { actions: Action[] }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="flex w-full flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search clients, tasks, or actions…"
              className={cn(
                "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              )}
            />
            <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Ctrl K</kbd>
          </div>
          <Command.List className="max-h-[340px] overflow-y-auto p-1.5">
            <Command.Empty className="p-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>
            {actions.map((a) => (
              <Command.Item
                key={a.id}
                value={a.label}
                onSelect={() => {
                  setOpen(false);
                  a.onSelect();
                }}
                className="flex cursor-default select-none items-center justify-between rounded-lg px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-secondary"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{a.label}</span>
                  {a.hint ? <span className="text-xs text-muted-foreground">{a.hint}</span> : null}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
