import { redirect } from "next/navigation";
import { AdminLoginForm } from "./AdminLoginForm";
import { hasAdminSession } from "../../lib/auth/adminSession";

export default async function AdminLoginPage() {
  if (await hasAdminSession()) {
    redirect("/admin/bookings");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#efe9ff_0%,#f7f7fb_38%,#f3f4f8_100%)] px-4 py-10">
      <AdminLoginForm />
    </main>
  );
}
