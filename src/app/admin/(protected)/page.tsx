import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, MessageSquare, Eye } from "lucide-react";
import prisma from "@/lib/prisma";

async function getDashboardStats() {
  try {
    const [userCount, mangaCount, chapterCount, commentCount] = await Promise.all([
      prisma.user.count(),
      prisma.manga.count(),
      prisma.chapter.count(),
      prisma.comment.count(),
    ]);
    return { userCount, mangaCount, chapterCount, commentCount, error: null };
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return { userCount: 0, mangaCount: 0, chapterCount: 0, commentCount: 0, error: "Failed to load statistics" };
  }
}

export default async function AdminDashboardPage() {
  const { userCount, mangaCount, chapterCount, commentCount, error } = await getDashboardStats();

  const stats = [
    { title: "Total Users", value: userCount, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Total Manga", value: mangaCount, icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { title: "Total Chapters", value: chapterCount, icon: Eye, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Total Comments", value: commentCount, icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-400 mt-2">Welcome to the Hentography administration panel.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-400">
          ⚠️ {error} — statistics may be unavailable due to a database connection issue.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stat.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Activity charts will be implemented here using Recharts.</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Pending Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Moderation queue will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
