import { ReactNode } from "react";

export const metadata = {
  title: "Payment — All Tails",
  robots: { index: false, follow: false, nocache: true },
};

export default function PayLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
