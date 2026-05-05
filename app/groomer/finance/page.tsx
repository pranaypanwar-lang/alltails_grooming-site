import { redirect } from "next/navigation";
import { getGroomerSessionMember } from "../../../lib/auth/groomerSession";
import { GroomerFinanceClient } from "./GroomerFinanceClient";

export default async function GroomerFinancePage() {
  const member = await getGroomerSessionMember();
  if (!member) redirect("/groomer-login");

  return <GroomerFinanceClient memberName={member.name} />;
}
