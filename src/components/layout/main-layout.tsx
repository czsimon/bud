import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function MainLayout({
  email,
  children,
}: {
  email: string | null;
  children: ReactNode;
}) {
  return (
    <div className="grid h-dvh min-h-0 grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden sm:grid-cols-[13rem_minmax(0,1fr)] sm:grid-rows-[auto_minmax(0,1fr)]">
      <Header email={email} />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-paper sm:col-start-2 sm:row-start-2">
        {children}
      </div>
    </div>
  );
}
