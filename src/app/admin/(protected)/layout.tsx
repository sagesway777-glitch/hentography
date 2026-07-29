import { getAdminUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Book, Layers, Users, MessageSquare, AlertTriangle, Settings, Megaphone, FileText, BarChart2 } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export const metadata = {
  title: "Admin Dashboard | Hentography",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    redirect("/admin/login");
  }

  const user = adminUser!;

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/manga", label: "Manga", icon: Book },
    { href: "/admin/chapters", label: "Chapters", icon: Layers },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/comments", label: "Comments", icon: MessageSquare },
    { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
    { href: "/admin/ads", label: "Ads", icon: Megaphone },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Admin Panel</h2>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <Icon className="w-4 h-4 text-slate-400" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <AdminLogoutButton email={user.email} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
