import { Header } from "@/components/layout/Header";
import { TabNav } from "@/components/layout/TabNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <TabNav />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
