"use client";

import { Activity } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-surface px-6 py-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-accent" />
          <h1 className="text-xl font-bold text-foreground">
            Neuro Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-positive animate-pulse" />
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>
    </header>
  );
}
