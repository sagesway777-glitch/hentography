import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { List } from "lucide-react";
import { ShareButton } from "@/components/ui/share-button";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, username: true },
  });

  if (!user) return { title: "User Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/profile/${user.username}`;
  const title = `${user.name || user.username} | Profile`;
  const description = `Check out ${user.name || user.username}'s profile on HentaiPlus.`;

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    alternates: { canonical: `/profile/${user.username}` },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profileUser = await prisma.user.findUnique({
    where: { username },
    include: {
      playlists: {
        where: { isPublic: true },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { items: true } },
          items: {
            take: 4,
            orderBy: { sortOrder: "asc" },
            include: { manga: { select: { coverImage: true } } },
          },
        },
      },
      _count: {
        select: {
          history: true,
          bookmarks: true,
          reviews: true,
        },
      },
    },
  });

  if (!profileUser) {
    notFound();
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-12">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16 text-center md:text-left">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center text-5xl font-bold overflow-hidden shadow-2xl shrink-0 relative">
          {profileUser.image ? (
            <Image src={profileUser.image} alt={profileUser.name || "User"} fill className="object-cover" />
          ) : (
            <span className="text-slate-500">{profileUser.name?.charAt(0).toUpperCase() || profileUser.username?.charAt(0).toUpperCase() || "U"}</span>
          )}
        </div>
        <div className="flex-1 mt-4 md:mt-0">
          <h1 className="text-4xl font-bold text-white mb-2">{profileUser.name || profileUser.username}</h1>
          <div className="flex items-center gap-3 mb-6">
            <p className="text-[var(--primary)] font-medium">@{profileUser.username}</p>
            <ShareButton 
              title={`${profileUser.name || profileUser.username}'s Profile`}
              text={`Check out ${profileUser.name || profileUser.username} on HentaiPlus!`}
              className="h-7 px-3 text-xs border-slate-700 bg-slate-900/50 hover:bg-slate-800"
            />
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
            <div>
              <div className="text-2xl font-bold text-white">{profileUser._count.history}</div>
              <div className="text-slate-500 font-medium tracking-wide uppercase text-xs">Read</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{profileUser._count.bookmarks}</div>
              <div className="text-slate-500 font-medium tracking-wide uppercase text-xs">Bookmarks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{profileUser._count.reviews}</div>
              <div className="text-slate-500 font-medium tracking-wide uppercase text-xs">Reviews</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{profileUser.playlists.length}</div>
              <div className="text-slate-500 font-medium tracking-wide uppercase text-xs">Playlists</div>
            </div>
          </div>
        </div>
      </div>

      {/* Public Playlists */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <List className="w-6 h-6 text-indigo-500" />
          Public Playlists
        </h2>
        
        {profileUser.playlists.length === 0 ? (
          <div className="bg-slate-900/30 rounded-2xl border border-slate-800/50 border-dashed p-12 text-center">
            <p className="text-slate-400">This user hasn&apos;t created any public playlists yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profileUser.playlists.map((playlist) => (
              <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
                <div className="group bg-slate-950 rounded-2xl border border-slate-800 hover:border-indigo-500/50 overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
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

                  <div className="p-4">
                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors mb-1 truncate">
                      {playlist.name}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3 h-10">
                      {playlist.description || "No description provided."}
                    </p>
                    <div className="flex items-center justify-between text-xs font-medium">
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
      </div>
    </div>
  );
}
