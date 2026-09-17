"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/data";

export function Header({ email }: { email: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="shrink-0 border-b border-rule/80 bg-surface sm:col-start-2 sm:row-start-1">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3">
          <p className="text-lg font-semibold tracking-tight">Bud</p>
          <p className="hidden text-sm text-muted sm:block">
            Household cash over time
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden max-w-45 truncate text-muted sm:block">
            {email}
          </span>
          <button
            type="button"
            className="btn-ghost py-1.5"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
