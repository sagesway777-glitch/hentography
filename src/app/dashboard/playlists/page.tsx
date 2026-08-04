import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Playlists | Dashboard | HentaiPlus",
};

export default async function PlaylistsPage() {
  const { dbUserId } = await requireAuth();

  const playlists = await prisma.playlist.findMany({
    where: { userId: dbUserId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
      items: {
        take: 4,
        orderBy: { sortOrder: "asc" },
        include: {
          manga: { select: { coverImage: true } }
        }
      }
    },
  });

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Your Playlists</CardTitle>
          <CardDescription>Manage your custom collections</CardDescription>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          New Playlist
        </Button>
      </CardHeader>
      <CardContent>
        {playlists.length === 0 ? (
          <p className="text-slate-400 text-center py-8">You haven&apos;t created any playlists yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
                <div className="group bg-slate-950 rounded-2xl border border-slate-800 hover:border-indigo-500/50 overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                  {/* Composite Cover */}
                  <div className="aspect-video w-full relative bg-slate-900 overflow-hidden border-b border-slate-800">
                    {playlist.coverImage ? (
                      <Image src={playlist.coverImage} alt={playlist.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : playlist.items.length > 0 ? (
                      <div className="grid grid-cols-2 grid-rows-2 w-full h-full group-hover:scale-105 transition-transform duration-500">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const item = playlist.items[i];
                          if (item && item.manga.coverImage) {
                            return (
                              <div key={i} className="relative w-full h-full border border-slate-950">
                                <Image src={item.manga.coverImage} alt="Cover" fill className="object-cover" />
                              </div>
                            );
                          }
                          return <div key={i} className="bg-slate-800 border border-slate-950" />;
                        })}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <List className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <List className="w-3 h-3" />
                      {playlist._count.items}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors mb-1 truncate">
                      {playlist.name}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3 h-10">
                      {playlist.description || "No description provided."}
                    </p>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className={`px-2 py-1 rounded-full ${playlist.isPublic ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                        {playlist.isPublic ? "Public" : "Private"}
                      </span>
                      <span className="text-slate-500">
                        Updated {formatDistanceToNow(new Date(playlist.updatedAt))} ago
                      </span>
                    </div>
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
