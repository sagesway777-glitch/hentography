import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Bookmark, Share2, Eye, Heart, BookOpen, Play, ChevronDown } from "lucide-react";
import { MangaRatingSection } from "@/components/manga/manga-rating-section";
import { CommentsSection } from "@/components/manga/comments-section";
import { ReviewsSection } from "@/components/manga/reviews-section";
import { AdSlot } from "@/components/ads/ad-slot";
import { ShareButton } from "@/components/ui/share-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/manga/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) return { title: "Manga Not Found" };
  const manga = await res.json();

  return {
    title: `${manga.title} - Read Online Free | Hentography`,
    description: manga.seoDescription || manga.synopsis?.slice(0, 160) || `Read ${manga.title} online for free. Latest chapters available.`,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: manga.title,
      description: manga.seoDescription || manga.synopsis?.slice(0, 160) || "",
      images: [manga.coverImage],
      url: `${baseUrl}/manga/${manga.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: manga.title,
      description: manga.seoDescription || manga.synopsis?.slice(0, 160) || "",
      images: [manga.coverImage],
    },
    alternates: { canonical: `/manga/${manga.slug}` },
  };
}

export default async function MangaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/manga/${slug}`, { next: { revalidate: 300 } });

  if (!res.ok) {
    notFound();
  }

  const manga = await res.json();

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: manga.title, item: `${baseUrl}/manga/${manga.slug}` },
    ],
  };

  const mangaSchema = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    name: manga.title,
    alternateName: manga.alternativeTitles,
    description: manga.synopsis,
    image: manga.coverImage,
    genre: manga.genres?.map((g: any) => g.genre.name),
    author: manga.authors?.map((a: any) => ({ "@type": "Person", name: a.author.name })),
    publisher: manga.publishers?.map((p: any) => ({ "@type": "Organization", name: p.publisher.name })),
    datePublished: manga.releaseYear ? `${manga.releaseYear}-01-01` : undefined,
    aggregateRating: manga.ratingCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: manga.averageRating,
      ratingCount: manga.ratingCount,
      bestRating: 5,
      worstRating: 1
    } : undefined
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(mangaSchema) }} />
      <div className="min-h-screen bg-slate-950">
        {manga.bannerImage && (
          <div className="relative h-[300px] sm:h-[400px] w-full">
            <Image src={manga.bannerImage} alt={manga.title} fill className="object-cover opacity-30" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-48 sm:-mt-56 relative z-10">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative w-[200px] sm:w-[280px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700/50">
                <Image src={manga.coverImage} alt={manga.title} fill className="object-cover" priority />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-3">
                {manga.isFeatured && <Badge variant="default">Featured</Badge>}
                {manga.isTrending && <Badge variant="warning" className="flex items-center gap-1"><span className="animate-pulse">🔥</span> Trending</Badge>}
                <Badge variant="secondary">{manga.status}</Badge>
                <Badge variant="outline">{manga.language}</Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">{manga.title}</h1>
              {manga.alternativeTitles && (
                <p className="text-slate-400 text-sm mb-4">{manga.alternativeTitles}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start mb-6">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="text-lg font-bold text-white">{manga.averageRating.toFixed(1)}</span>
                  <span className="text-slate-400 text-sm">({manga.ratingCount} votes)</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Eye className="w-4 h-4" />
                  <span>{manga.views.toLocaleString()} views</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Bookmark className="w-4 h-4" />
                  <span>{manga.bookmarkCount}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center sm:justify-start mb-6">
                {manga.chapters?.length > 0 && (
                  <Link href={`/read/${manga.slug}/chapter-${manga.chapters[0].chapterNumber}`}>
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                      <Play className="w-5 h-5 mr-2" />
                      Read Now
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  <Bookmark className="w-5 h-5 mr-2" />
                  Bookmark
                </Button>
                <ShareButton 
                  title={manga.title} 
                  text={`Read ${manga.title} on Hentography!`} 
                  className="h-11 px-8 text-slate-300 hover:text-white" 
                />
              </div>
            </div>
          </div>

          <AdSlot position="MANGA_TOP" className="mt-8 mb-4" />

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="glass-card border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Synopsis</h2>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{manga.synopsis || "No synopsis available."}</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {manga.authors?.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-sm">Author</span>
                        <p className="text-white font-medium">{manga.authors.map((a: any) => a.author.name).join(", ")}</p>
                      </div>
                    )}
                    {manga.artists?.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-sm">Artist</span>
                        <p className="text-white font-medium">{manga.artists.map((a: any) => a.artist.name).join(", ")}</p>
                      </div>
                    )}
                    {manga.publishers?.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-sm">Publisher</span>
                        <p className="text-white font-medium">{manga.publishers.map((p: any) => p.publisher.name).join(", ")}</p>
                      </div>
                    )}
                    {manga.releaseYear && (
                      <div>
                        <span className="text-slate-400 text-sm">Release Year</span>
                        <p className="text-white font-medium">{manga.releaseYear}</p>
                      </div>
                    )}
                    {manga.demographic && (
                      <div>
                        <span className="text-slate-400 text-sm">Demographic</span>
                        <p className="text-white font-medium">{manga.demographic}</p>
                      </div>
                    )}
                    {manga.ageRating && (
                      <div>
                        <span className="text-slate-400 text-sm">Age Rating</span>
                        <p className="text-white font-medium">{manga.ageRating}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Genres & Themes</h2>
                  <div className="flex flex-wrap gap-2">
                    {manga.genres?.map((g: any) => (
                      <Link key={g.genre.id} href={`/search?genres=${g.genre.slug}`}>
                        <Badge variant="secondary" className="hover:bg-indigo-500/20 transition-colors cursor-pointer">{g.genre.name}</Badge>
                      </Link>
                    ))}
                    {manga.themes?.map((t: any) => (
                      <Link key={t.theme.id} href={`/search?themes=${t.theme.slug}`}>
                        <Badge key={t.theme.id} variant="outline" className="hover:bg-indigo-500/20 transition-colors cursor-pointer">{t.theme.name}</Badge>
                      </Link>
                    ))}
                    {manga.tags?.map((t: any) => (
                      <Badge key={t.tag.id} variant="outline" className="text-slate-400">{t.tag.name}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Rate This Manga</h2>
                  <MangaRatingSection
                    mangaId={manga.id}
                    initialRating={manga.userRating || 0}
                    averageRating={manga.averageRating}
                  />
                </CardContent>
              </Card>

              <ReviewsSection mangaId={manga.id} />
              
              <CommentsSection mangaId={manga.id} />
            </div>

            <div className="space-y-6">
              <Card className="glass-card border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Chapters</h2>
                  {manga.chapters?.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {manga.chapters.map((chapter: any) => (
                        <Link key={chapter.id} href={`/read/${manga.slug}/chapter-${chapter.chapterNumber}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-4 h-4 text-indigo-400" />
                              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                Chapter {chapter.chapterNumber}
                                {chapter.title && <span className="text-slate-500 ml-1">- {chapter.title}</span>}
                              </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-600 rotate-[-90deg]" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No chapters available yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
