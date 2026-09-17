"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const SIDEBAR_ITEMS = [
  { href: "/short-term", label: "Short term" },
  { href: "/budget", label: "Budget" },
  { href: "/events", label: "Events" },
  { href: "/accounts", label: "Accounts" },
  { href: "/categories", label: "Categories" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-rule bg-paper px-2 py-2 sm:col-start-1 sm:row-start-1 sm:row-span-2 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-r sm:border-b-0 sm:px-3 sm:py-4"
    >
      {SIDEBAR_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-left text-sm whitespace-nowrap ${
              active
                ? "bg-surface font-medium text-ink shadow-sm ring-1 ring-rule"
                : "text-muted hover:bg-surface/70 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
