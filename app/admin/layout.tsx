import { ReactNode } from "react";
import { AdminToastProvider } from "./components/common/AdminToastProvider";
import { AdminSidebar } from "./components/common/AdminSidebar";

export const metadata = {
  title: "Admin — All Tails",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">
        <AdminToastProvider>
          {children}
        </AdminToastProvider>
      </div>
    </div>
  );
}
