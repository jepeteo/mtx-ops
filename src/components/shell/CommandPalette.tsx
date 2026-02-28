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
      <DialogContent className="p-0">
        <Command className="flex w-full flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search clients, tasks, or actions…"
              className={cn(
                "w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              )}
            />
            <div className="text-xs text-muted-foreground">Ctrl K</div>
          </div>
          <Command.List className="max-h-[340px] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-sm text-muted-foreground">No results.</Command.Empty>
            {actions.map((a) => (
              <Command.Item
                key={a.id}
                value={a.label}
                onSelect={() => {
                  setOpen(false);
                  a.onSelect();
                }}
                className="flex cursor-default select-none items-center justify-between rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-secondary"
              >
                <div className="flex flex-col">
                  <span>{a.label}</span>
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
