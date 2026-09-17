import { HouseholdProvider } from "@/components/household-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <MainLayout email={user.email ?? null}>
      <HouseholdProvider>{children}</HouseholdProvider>
    </MainLayout>
  );
}
