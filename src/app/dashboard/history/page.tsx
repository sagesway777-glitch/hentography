import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Shield } from "lucide-react";

export const metadata = {
  title: "Reading History | Dashboard | HentaiPlus",
};

export default async function HistoryPage() {
  const { dbUserId } = await requireAuth();

  const historyItems = await prisma.readingHistory.findMany({
    where: { userId: dbUserId },
    orderBy: { lastReadAt: "desc" },
    include: {
      manga: {
        select: {
          title: true,
          slug: true,
          coverImage: true,
          status: true,
        },
      },
      chapter: {
        select: {
          chapterNumber: true,
          title: true,
        },
      },
    },
  });

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle>Recent Reading</CardTitle>
        <CardDescription>Pick up where you left off</CardDescription>
      </CardHeader>
      <CardContent>
        {historyItems.length === 0 ? (
          <p className="text-slate-400 text-center py-8">You haven&apos;t read any manga yet.</p>
        ) : (
          <div className="space-y-4">
            {historyItems.map((item) => (
              <Link 
                key={item.id} 
                href={`/read/${item.manga.slug}/chapter-${item.chapter.chapterNumber}`}
              >
                <div className="group flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-all cursor-pointer">
                  <div className="relative w-full sm:w-24 h-36 sm:h-32 rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-lg">
                    {item.manga.coverImage ? (
                      <Image
                        src={item.manga.coverImage}
                        alt={item.manga.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Shield className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 py-1 text-center sm:text-left">
                    <h3 className="font-bold text-lg text-slate-200 group-hover:text-indigo-300 truncate transition-colors">
                      {item.manga.title}
                    </h3>
                    <p className="text-indigo-400 font-medium text-sm mt-1">
                      Chapter {item.chapter.chapterNumber} {item.chapter.title ? `- ${item.chapter.title}` : ""}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>Read {formatDistanceToNow(new Date(item.lastReadAt))} ago</span>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto text-center sm:text-right mt-2 sm:mt-0">
                    <span className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors">
                      Continue Reading
                    </span>
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
