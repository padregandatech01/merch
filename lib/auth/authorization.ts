import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?error=configuration");
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at) redirect("/login");
  const { data: staff, error: roleError } = await supabase
    .from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleError || staff?.role !== "dept_admin") redirect("/login?error=unauthorized");
  return user;
}
