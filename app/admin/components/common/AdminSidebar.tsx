"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Truck,
  ClipboardList,
  HeadphonesIcon,
  Users,
  UserCog,
  Network,
  Wallet,
  LayoutGrid,
  FileText,
  Megaphone,
  Tag,
  MessageSquare,
  Quote,
  ScrollText,
  LogOut,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
      { href: "/admin/dispatch", label: "Dispatch", icon: Truck },
      { href: "/admin/qa", label: "QA", icon: ClipboardList },
      { href: "/admin/support", label: "Support", icon: HeadphonesIcon },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/workforce", label: "Workforce", icon: UserCog },
      { href: "/admin/teams", label: "Teams", icon: Network },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/finance", label: "Finance", icon: Wallet },
      { href: "/admin/slots", label: "Slots", icon: LayoutGrid },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blogs", label: "Blogs", icon: FileText },
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/admin/coupons", label: "Coupons", icon: Tag },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare },
      { href: "/admin/hero-testimonial", label: "Hero Quote", icon: Quote },
      { href: "/admin/legal", label: "Legal", icon: ScrollText },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="flex h-screen w-[240px] shrink-0 flex-col bg-[#1f1f2c] overflow-y-auto">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-[#2e2d3d]">
        <span className="text-[13px] font-black tracking-[-0.02em] text-white">
          All Tails Admin
        </span>
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3">
        <Link
          href="/admin"
          className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold transition-colors ${
            isActive("/admin")
              ? "bg-[#6d5bd0] text-white"
              : "text-[#a09cb8] hover:bg-[#2e2d3d] hover:text-white"
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Dashboard
          {isActive("/admin") && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
          )}
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 pt-4 pb-3 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4a4a65]">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive(href)
                      ? "bg-[#6d5bd0] text-white"
                      : "text-[#7c8499] hover:bg-[#2e2d3d] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-[#2e2d3d] p-3">
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#7c8499] transition-colors hover:bg-[#2e2d3d] hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
