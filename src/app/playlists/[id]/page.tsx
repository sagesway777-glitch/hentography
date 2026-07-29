import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { List, Clock, Share2, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/ui/share-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { name: true, description: true },
  });

  if (!playlist) return { title: "Playlist Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/playlists/${id}`;

  return {
    title: `${playlist.name} | Hentography Playlists`,
    description: playlist.description || `Check out the manga playlist: ${playlist.name}`,
    metadataBase: new URL(baseUrl),
    alternates: { canonical: `/playlists/${id}` },
    openGraph: {
      title: playlist.name,
      description: playlist.description || `Check out the manga playlist: ${playlist.name}`,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: playlist.name,
      description: playlist.description || `Check out the manga playlist: ${playlist.name}`,
    },
  };
}

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser().catch(() => null);

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
      items: {
        orderBy: [{ sortOrder: "asc" }, { addedAt: "desc" }],
        include: {
          manga: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              status: true,
              averageRating: true,
              genres: { include: { genre: true }, take: 2 },
              chapters: {
                where: { isPublished: true },
                orderBy: { chapterNumber: "desc" },
                take: 1,
                select: { chapterNumber: true },
              },
            },
          },
        },
      },
    },
  });

  if (!playlist) {
    notFound();
  }

  const isOwner = user?.id === playlist.userId;

  if (!playlist.isPublic && !isOwner) {
    // If it's private and we aren't the owner, act like it doesn't exist
    notFound();
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Playlist Cover (Composite of first 4 items or a single cover) */}
        <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl relative">
          {playlist.coverImage ? (
            <Image
              src={playlist.coverImage}
              alt={playlist.name}
              fill
              className="object-cover"
            />
          ) : playlist.items.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
              {Array.from({ length: 4 }).map((_, i) => {
                const item = playlist.items[i];
                if (item && item.manga.coverImage) {
                  return (
                    <div key={i} className="relative w-full h-full border border-slate-900">
                      <Image
                        src={item.manga.coverImage}
                        alt="Cover part"
                        fill
                        className="object-cover"
                      />
                    </div>
                  );
                }
                return <div key={i} className="bg-slate-800 border border-slate-900" />;
              })}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800/50">
              <List className="w-16 h-16 text-slate-700" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant={playlist.isPublic ? "default" : "secondary"} className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20">
              {playlist.isPublic ? "Public Playlist" : "Private Playlist"}
            </Badge>
            {isOwner && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                You own this
              </Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            {playlist.name}
          </h1>
          <p className="text-slate-400 text-lg mb-6 max-w-3xl">
            {playlist.description || "No description provided."}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 relative">
                {playlist.user.image ? (
                  <Image src={playlist.user.image} alt={playlist.user.name || "User"} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-300">
                    {playlist.user.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <span className="font-medium text-slate-300">{playlist.user.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span>{playlist.items.length} items</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Updated {formatDistanceToNow(new Date(playlist.updatedAt))} ago</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 font-semibold">
              Read First
            </Button>
            <ShareButton 
              title={playlist.name}
              text={`Check out ${playlist.name} on Hentography!`}
              className="rounded-full border-slate-700 hover:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {playlist.items.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-slate-800/50 border-dashed">
            <List className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">This playlist is empty</h3>
            {isOwner ? (
              <p className="text-slate-400 max-w-sm mx-auto">
                Explore the library and click the "Add to Playlist" button on any manga to start building your collection.
              </p>
            ) : (
              <p className="text-slate-400">The owner hasn't added any manga yet.</p>
            )}
          </div>
        ) : (
          playlist.items.map((item, index) => (
            <Link key={item.id} href={`/manga/${item.manga.slug}`}>
              <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-all cursor-pointer">
                <div className="w-10 text-center font-bold text-slate-600 group-hover:text-indigo-400 transition-colors">
                  {index + 1}
                </div>
                
                <div className="relative w-16 h-20 md:w-20 md:h-28 rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-lg">
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
                  {/* Status Overlay */}
                  {item.manga.status === "COMPLETED" && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-[9px] font-bold text-white uppercase tracking-wider backdrop-blur-sm shadow-sm">
                      END
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 py-2">
                  <h3 className="font-bold text-base md:text-lg text-slate-200 group-hover:text-indigo-300 truncate mb-1 transition-colors">
                    {item.manga.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-1 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      <Heart className="w-3 h-3 fill-current" />
                      <span>{item.manga.averageRating?.toFixed(1) || "N/A"}</span>
                    </div>
                    {item.manga.chapters[0] && (
                      <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                        Ch. {item.manga.chapters[0].chapterNumber}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.manga.genres.map((g) => (
                      <span key={g.genre.id} className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {g.genre.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-end gap-2 text-sm text-slate-500">
                  <span>Added {formatDistanceToNow(new Date(item.addedAt))} ago</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
