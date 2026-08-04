import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash, Eye, Settings } from "lucide-react";
import prisma from "@/lib/prisma";

export default async function AdminChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; mangaId?: string }>;
}) {
  const { page: pageStr, mangaId } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 30;
  const skip = (page - 1) * limit;

  const chapters = await prisma.chapter.findMany({
    where: mangaId ? { mangaId } : undefined,
    skip,
    take: limit,
    orderBy: [
      { mangaId: "desc" },
      { chapterNumber: "desc" },
    ],
    include: {
      manga: {
        select: { title: true, coverImage: true, slug: true }
      }
    }
  });

  const total = await prisma.chapter.count({ 
    where: mangaId ? { mangaId } : undefined 
  });
  
  const mangaList = await prisma.manga.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Chapters Management</h1>
          <p className="text-slate-400 mt-1">Manage all chapters and pages across your library.</p>
        </div>
        <Link href="/admin/chapters/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Chapter
          </Button>
        </Link>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg">All Chapters</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search chapters..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-y border-slate-800">
                <tr>
                  <th className="px-6 py-3">Chapter</th>
                  <th className="px-6 py-3">Manga</th>
                  <th className="px-6 py-3">Pages</th>
                  <th className="px-6 py-3">Views</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {chapters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No chapters found.
                    </td>
                  </tr>
                ) : (
                  chapters.map((chapter) => (
                    <tr key={chapter.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex flex-col">
                          <span>Chapter {chapter.chapterNumber}</span>
                          {chapter.title && <span className="text-xs text-slate-400">{chapter.title}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {chapter.manga.coverImage && (
                            <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0 bg-slate-800 hidden sm:block">
                              <img src={chapter.manga.coverImage} alt={chapter.manga.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span className="truncate max-w-[200px]">{chapter.manga.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{chapter.pages}</td>
                      <td className="px-6 py-4">{chapter.views}</td>
                      <td className="px-6 py-4">
                        {chapter.isPublished ? (
                          <span className="text-green-400 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">Published</span>
                        ) : (
                          <span className="text-amber-400 text-xs font-medium bg-amber-400/10 px-2 py-1 rounded-full">Draft</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/manga/${chapter.manga.slug}/chapter-${chapter.chapterNumber}`} target="_blank" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-slate-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/admin/chapters/${chapter.id}/edit`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
