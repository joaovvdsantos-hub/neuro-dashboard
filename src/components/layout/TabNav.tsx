"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "/dashboard" },
  { label: "VSL Analytics", href: "/dashboard/vsl-analytics" },
  { label: "Campanhas", href: "/dashboard/campanhas" },
  { label: "Detalhamento", href: "/dashboard/detalhamento" },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface">
      <div className="container mx-auto flex gap-0 px-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors border-b-2",
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
