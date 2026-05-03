import Link from "next/link";
import { ReactNode } from "react";
import { AdminToastProvider } from "./components/common/AdminToastProvider";

export const metadata = { title: "Admin — All Tails" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-6 px-5 h-12">
            <span className="text-sm font-semibold text-gray-900 tracking-tight">All Tails Admin</span>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin/bookings" className="text-gray-600 hover:text-gray-900 transition-colors">
                Bookings
              </Link>
              <Link href="/admin/dispatch" className="text-gray-600 hover:text-gray-900 transition-colors">
                Dispatch
              </Link>
              <Link href="/admin/qa" className="text-gray-600 hover:text-gray-900 transition-colors">
                QA
              </Link>
              <Link href="/admin/workforce" className="text-gray-600 hover:text-gray-900 transition-colors">
                Workforce
              </Link>
              <Link href="/admin/messages" className="text-gray-600 hover:text-gray-900 transition-colors">
                Messages
              </Link>
              <Link href="/admin/blogs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Blogs
              </Link>
              <Link href="/admin/hero-testimonial" className="text-gray-600 hover:text-gray-900 transition-colors">
                Hero Quote
              </Link>
              <Link href="/admin/legal" className="text-gray-600 hover:text-gray-900 transition-colors">
                Legal
              </Link>
              <Link href="/admin/campaigns" className="text-gray-600 hover:text-gray-900 transition-colors">
                Campaigns
              </Link>
              <Link href="/admin/coupons" className="text-gray-600 hover:text-gray-900 transition-colors">
                Coupons
              </Link>
              <Link href="/admin/support" className="text-gray-600 hover:text-gray-900 transition-colors">
                Support
              </Link>
              <Link href="/admin/teams" className="text-gray-600 hover:text-gray-900 transition-colors">
                Teams
              </Link>
              <Link href="/admin/slots" className="text-gray-600 hover:text-gray-900 transition-colors">
                Slots
              </Link>
            </nav>
            <form action="/api/admin/logout" method="post" className="ml-auto">
              <button
                type="submit"
                className="rounded-[10px] border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                Logout
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-5 py-6">
          {children}
        </main>
      </div>
    </AdminToastProvider>
  );
}
