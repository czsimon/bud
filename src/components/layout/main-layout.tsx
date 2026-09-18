"use client";

import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function MainLayout({
  email,
  children,
}: {
  email: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden md:flex-row">
      <div className="flex shrink-0 items-center gap-1 border-b border-rule bg-paper px-2 py-2 md:hidden">
        <button
          type="button"
          className="icon-btn"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="app-sidebar"
          onClick={() => setOpen(true)}
        >
          <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
        </button>
        <p className="text-lg font-semibold tracking-tight">Bud</p>
      </div>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="drawer-scrim fixed inset-0 z-40 bg-scrim md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Sidebar email={email} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-paper">
        {children}
      </div>
    </div>
  );
}
