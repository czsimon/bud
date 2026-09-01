import { Dashboard } from "@/components/dashboard";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return <Dashboard mode="local" />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <Dashboard mode="supabase" email={user.email} />;
}
