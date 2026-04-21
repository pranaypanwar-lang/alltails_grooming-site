import { redirect } from "next/navigation";
import { adminPrisma } from "../api/admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../lib/auth/groomerSession";
import { serializeGroomerHome } from "../../lib/groomerHome";
import { GroomerHomeClient } from "./home/[memberId]/GroomerHomeClient";

export default async function GroomerDashboardPage() {
  const member = await getGroomerSessionMember();
  if (!member) {
    redirect("/groomer-login");
  }

  const home = await serializeGroomerHome(adminPrisma, member.id);
  if (!home) {
    redirect("/groomer-login");
  }

  return <GroomerHomeClient initialHome={home} mode="session" />;
}
