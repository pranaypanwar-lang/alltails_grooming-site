import { redirect } from "next/navigation";
import { GroomerLoginForm } from "./GroomerLoginForm";
import { hasGroomerSession } from "../../lib/auth/groomerSession";

export default async function GroomerLoginPage() {
  if (await hasGroomerSession()) {
    redirect("/groomer");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#efe9ff_0%,#f7f7fb_38%,#eef2ff_100%)] px-4 py-10">
      <GroomerLoginForm />
    </main>
  );
}
