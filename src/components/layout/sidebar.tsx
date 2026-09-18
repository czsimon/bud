"use client";

import {
  faArrowRightFromBracket,
  faBuildingColumns,
  faCalendarDays,
  faChartLine,
  faTags,
  faWallet,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/data";

export const SIDEBAR_ITEMS = [
  { href: "/short-term", label: "Short term", icon: faChartLine },
  { href: "/budget", label: "Budget", icon: faWallet },
  { href: "/events", label: "Events", icon: faCalendarDays },
  { href: "/accounts", label: "Accounts", icon: faBuildingColumns },
  { href: "/categories", label: "Categories", icon: faTags },
] as const;

export function Sidebar({
  email,
  open,
  onClose,
}: {
  email: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      id="app-sidebar"
      className={`fixed inset-y-0 left-0 z-50 flex w-52 shrink-0 flex-col border-r border-rule bg-paper transition-transform duration-200 ease-out md:static md:z-0 md:h-full md:translate-x-0 md:visible ${
        open
          ? "translate-x-0 visible"
          : "invisible -translate-x-full md:visible"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-4 pb-3">
        <p className="px-3 py-1 text-lg font-semibold tracking-tight">Bud</p>
        <div className="md:hidden">
          <button
            type="button"
            className="icon-btn"
            aria-label="Close menu"
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav
        aria-label="Main"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3"
      >
        {SIDEBAR_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                active
                  ? "border-rule bg-surface font-medium text-ink shadow-sm text-teal-deep"
                  : "border-transparent text-muted hover:bg-surface/70 hover:text-ink"
              }`}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex shrink-0 flex-col items-stretch gap-2 border-t border-rule px-3 pt-3 pb-4">
        {email ? (
          <p className="truncate px-3 text-xs text-muted" title={email}>
            {email}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-ghost inline-flex w-full items-center justify-center py-1.5"
          onClick={handleSignOut}
        >
          <FontAwesomeIcon
            icon={faArrowRightFromBracket}
            className="mr-1.5 h-3.5 w-3.5"
            aria-hidden
          />
          Sign out
        </button>
      </div>
    </aside>
  );
}
