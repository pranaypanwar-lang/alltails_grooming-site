import { ReactNode } from "react";

import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

type SeoPageShellProps = {
  children: ReactNode;
};

export function SeoPageShell({ children }: SeoPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fcfbff] text-[#211c35]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
