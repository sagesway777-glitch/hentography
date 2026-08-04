import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Shield, Bookmark, Heart } from "lucide-react";

export const metadata = {
  title: "Bookmarks | Dashboard | Hentography",
};

export default async function BookmarksPage() {
  const { dbUserId } = await requireAuth();

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: dbUserId },
    orderBy: { createdAt: "desc" },
    include: {
      manga: {
        select: {
          title: true,
          slug: true,
          coverImage: true,
          status: true,
          averageRating: true,
          chapters: {
            where: { isPublished: true },
            orderBy: { chapterNumber: "desc" },
            take: 1,
            select: { chapterNumber: true, createdAt: true },
          }
        },
      },
    },
  });

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle>Your Bookmarks</CardTitle>
        <CardDescription>Manga you&apos;re tracking</CardDescription>
      </CardHeader>
      <CardContent>
        {bookmarks.length === 0 ? (
          <p className="text-slate-400 text-center py-8">You haven&apos;t bookmarked any manga yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {bookmarks.map((bookmark) => (
              <Link 
                key={bookmark.id} 
                href={`/manga/${bookmark.manga.slug}`}
                className="group flex flex-col"
              >
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-900 mb-3 shadow-lg border border-slate-800 group-hover:border-indigo-500/50 transition-colors">
                  {bookmark.manga.coverImage ? (
                    <Image
                      src={bookmark.manga.coverImage}
                      alt={bookmark.manga.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Shield className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  
                  {/* Status Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                    {bookmark.manga.status === "COMPLETED" && (
                      <div className="px-1.5 py-0.5 rounded bg-emerald-500/90 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                        END
                      </div>
                    )}
                    <div className="px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-indigo-400 backdrop-blur-sm border border-slate-700/50 flex items-center gap-1">
                      <Bookmark className="w-2.5 h-2.5 fill-current" />
                      Saved
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-sm text-slate-200 group-hover:text-indigo-400 line-clamp-2 transition-colors mb-1.5">
                    {bookmark.manga.title}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-auto">
                    {bookmark.manga.chapters[0] ? (
                      <span className="text-[11px] font-medium text-slate-400">
                        Ch. {bookmark.manga.chapters[0].chapterNumber}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500">
                        No chapters
                      </span>
                    )}
                    
                    {bookmark.manga.averageRating > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                        <Heart className="w-3 h-3 fill-current" />
                        <span>{bookmark.manga.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
