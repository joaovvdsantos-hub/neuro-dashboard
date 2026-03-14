"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "OVERVIEW", href: "/dashboard" },
  { label: "VSL ANALYTICS", href: "/dashboard/vsl-analytics" },
  { label: "CAMPANHAS", href: "/dashboard/campanhas" },
  { label: "DETALHAMENTO", href: "/dashboard/detalhamento" },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-0 border-b border-[#2A2A2A] mt-2">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive
                ? "text-white border-b-2 border-[#00FF9D] pb-3 px-4 text-sm font-medium -mb-px"
                : "text-[#A0A0A0] hover:text-white pb-3 px-4 text-sm font-medium transition-colors"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
