import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash, Eye } from "lucide-react";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export default async function AdminMangaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { page: pageStr, search } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Prisma.MangaWhereInput = search ? { title: { contains: search, mode: Prisma.QueryMode.insensitive } } : {};

  const [mangaList, total] = await Promise.all([
    prisma.manga.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { chapters: true }
        }
      }
    }),
    prisma.manga.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Manga Management</h1>
          <p className="text-slate-400 mt-1">Manage all manga entries in the database.</p>
        </div>
        <Link href="/admin/manga/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Manga
          </Button>
        </Link>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="py-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">All Manga</CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-y border-slate-800">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Chapters</th>
                  <th className="px-6 py-3">Views</th>
                  <th className="px-6 py-3">Published</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {mangaList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No manga found.
                    </td>
                  </tr>
                ) : (
                  mangaList.map((manga) => (
                    <tr key={manga.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                        {manga.coverImage && (
                          <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-slate-800">
                            <img src={manga.coverImage} alt={manga.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="truncate max-w-[200px]">{manga.title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          manga.status === "ONGOING" ? "bg-blue-500/10 text-blue-400" :
                          manga.status === "COMPLETED" ? "bg-green-500/10 text-green-400" :
                          "bg-slate-500/10 text-slate-400"
                        }`}>
                          {manga.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{manga._count.chapters}</td>
                      <td className="px-6 py-4">{manga.views}</td>
                      <td className="px-6 py-4">
                        {manga.isDraft ? (
                          <span className="text-amber-400 text-xs font-medium bg-amber-400/10 px-2 py-1 rounded-full">Draft</span>
                        ) : (
                          new Date(manga.publishedAt!).toLocaleDateString()
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/manga/${manga.slug}`} target="_blank" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-slate-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/admin/manga/${manga.id}/edit`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10">
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
