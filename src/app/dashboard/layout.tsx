import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata = {
  title: "Dashboard | Hentography",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dbUserId } = await requireAuth();
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user stats
  const [historyCount, bookmarksCount, reviewsCount, playlistsCount] = await Promise.all([
    prisma.readingHistory.count({ where: { userId: dbUserId } }),
    prisma.bookmark.count({ where: { userId: dbUserId } }),
    prisma.review.count({ where: { userId: dbUserId } }),
    prisma.playlist.count({ where: { userId: dbUserId } }),
  ]);

  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "/dashboard";

  const tabs = [
    { name: "History", path: "/dashboard/history" },
    { name: "Bookmarks", path: "/dashboard/bookmarks" },
    { name: "Playlists", path: "/dashboard/playlists" },
    { name: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 text-center md:text-left">
        <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-4 border-slate-800 flex items-center justify-center text-3xl font-bold overflow-hidden shadow-xl shrink-0">
          {user.imageUrl ? (
            <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full object-cover" />
          ) : (
            user.fullName?.charAt(0).toUpperCase() || user.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase() || "U"
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{user.fullName || "User"}</h1>
          <p className="text-slate-400 mb-4">{user.primaryEmailAddress?.emailAddress}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm">
            <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl flex flex-col items-center">
              <span className="text-xl font-bold text-white">{historyCount}</span>
              <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold mt-1">Read</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl flex flex-col items-center">
              <span className="text-xl font-bold text-white">{bookmarksCount}</span>
              <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold mt-1">Bookmarks</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl flex flex-col items-center">
              <span className="text-xl font-bold text-white">{reviewsCount}</span>
              <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold mt-1">Reviews</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl flex flex-col items-center">
              <span className="text-xl font-bold text-white">{playlistsCount}</span>
              <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold mt-1">Playlists</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-800 mb-6 flex overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      <div className="pb-12">
        {children}
      </div>
    </div>
  );
}
