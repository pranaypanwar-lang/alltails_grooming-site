import { redirect } from "next/navigation";
import { hasAdminSession } from "../../lib/auth/adminSession";

export default async function AdminRoot() {
  if (!(await hasAdminSession())) {
    redirect("/admin-login");
  }
  redirect("/admin/bookings");
}
