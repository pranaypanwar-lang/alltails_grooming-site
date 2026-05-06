import { ReactNode } from "react";

export const metadata = {
  title: "Groomer — All Tails",
  robots: { index: false, follow: false, nocache: true },
};

export default function GroomerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
