"use client";

import { Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { TabNav } from "@/components/layout/TabNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ backgroundColor: "#000000" }} className="min-h-screen">
        <div className="max-w-[1600px] mx-auto px-6">
          <Suspense>
            <Header />
          </Suspense>
          <TabNav />
          <main className="pt-6 pb-10">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
