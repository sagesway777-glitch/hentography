import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  ArrowRight,
  Flame,
  Clock,
  Star,
  TrendingUp,
  Award,
  BookOpen,
  Zap,
  CheckCircle,
  Tag,
  Megaphone,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdSlot } from "@/components/ads/ad-slot";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { formatDistanceToNow } from "date-fns";

export const revalidate = 3600;

// ─── SEO Metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Hentography — Read Manga Online Free",
  description:
    "Read the latest manga online for free at Hentography. Discover new series, keep track of your reading progress, and join our community of passionate readers.",
  alternates: {
    canonical: "https://hentography.com",
  },
  openGraph: {
    title: "Hentography — Read Manga Online Free",
    description:
      "Discover thousands of manga titles. Read the latest chapters, track your progress, and join our community.",
    type: "website",
    url: "https://hentography.com",
    siteName: "Hentography",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hentography — Read Manga Online Free",
    description:
      "Discover thousands of manga titles. Read the latest chapters, track your progress.",
  },
};

// ─── Shared select shape — minimal fields for cards ───────────────────────────

const MANGA_CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  coverImage: true,
  status: true,
  averageRating: true,
  views: true,
  isTrending: true,
  chapters: {
    where: { isPublished: true },
    orderBy: { chapterNumber: "desc" as const },
    take: 1,
    select: { chapterNumber: true },
  },
  genres: {
    take: 2,
    select: { genre: { select: { name: true, slug: true } } },
  },
} as const;

// ─── Single consolidated data fetch ──────────────────────────────────────────

async function getData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const baseWhere = { isDraft: false };

  // Run all independent queries in parallel — no sequential waterfalls
  const [
    featured,
    trending,
    popular,
    recentlyUpdated,
    highestRated,
    mostViewed,
    completed,
    ongoing,
    newReleases,
    latestChapters,
    genres,
    announcements,
  ] = await Promise.all([
    // Featured (hero carousel) — includes synopsis for hero copy
    prisma.manga.findMany({
      where: { ...baseWhere, isFeatured: true },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        bannerImage: true,
        synopsis: true,
        status: true,
        genres: { take: 3, select: { genre: { select: { name: true } } } },
        chapters: {
          where: { isPublished: true },
          orderBy: { chapterNumber: "desc" },
          take: 1,
          select: { chapterNumber: true },
        },
      },
      take: 6,
      orderBy: { views: "desc" },
    }),

    // Trending — isTrending flag, ordered by views
    prisma.manga.findMany({
      where: { ...baseWhere, isTrending: true },
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { views: "desc" },
    }),

    // Popular — most bookmarks (deduplicated: no separate mostViewed section with same base query)
    prisma.manga.findMany({
      where: baseWhere,
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { bookmarkCount: "desc" },
    }),

    // Recently updated — chapters in last 7 days
    prisma.manga.findMany({
      where: {
        ...baseWhere,
        chapters: { some: { isPublished: true, createdAt: { gte: sevenDaysAgo } } },
      },
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),

    // Highest rated — require at least 3 ratings to prevent outliers
    prisma.manga.findMany({
      where: { ...baseWhere, ratingCount: { gte: 3 } },
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { averageRating: "desc" },
    }),

    // Most viewed — use views field directly
    prisma.manga.findMany({
      where: baseWhere,
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { views: "desc" },
    }),

    // Completed
    prisma.manga.findMany({
      where: { ...baseWhere, status: "COMPLETED" },
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { bookmarkCount: "desc" },
    }),

    // Ongoing — most recently updated
    prisma.manga.findMany({
      where: { ...baseWhere, status: "ONGOING" },
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),

    // New releases — added in last 30 days (replaces separate recentlyAdded query)
    prisma.manga.findMany({
      where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo } },
      select: MANGA_CARD_SELECT,
      take: 12,
      orderBy: { createdAt: "desc" },
    }),

    // Latest chapter updates — deduplicated per manga using distinct mangaId
    prisma.chapter.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 18,
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        createdAt: true,
        manga: { select: { id: true, title: true, slug: true, coverImage: true } },
      },
    }),

    // Genres ordered by manga count
    prisma.genre.findMany({
      take: 30,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { manga: true } },
      },
      orderBy: { manga: { _count: "desc" } },
    }),

    // Active announcements
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, content: true, type: true, createdAt: true },
    }),
  ]);

  // Deduplicate latestChapters by manga — only show the newest chapter per manga
  const seenMangaIds = new Set<string>();
  const deduplicatedChapters = latestChapters.filter((ch) => {
    if (seenMangaIds.has(ch.manga.id)) return false;
    seenMangaIds.add(ch.manga.id);
    return true;
  });

  return {
    featured,
    trending,
    popular,
    recentlyUpdated,
    highestRated,
    mostViewed,
    completed,
    ongoing,
    newReleases,
    latestChapters: deduplicatedChapters,
    genres,
    announcements,
  };
}

// ─── Continue Reading ─────────────────────────────────────────────────────────

async function getContinueReading(userId: string) {
  const items = await prisma.readingHistory.findMany({
    where: { userId },
    orderBy: { lastReadAt: "desc" },
    take: 6,
    select: {
      id: true,
      lastReadAt: true,
      manga: { select: { title: true, slug: true, coverImage: true } },
      chapter: { select: { chapterNumber: true } },
    },
  });
  return items;
}

// ─── Recommendation engine ────────────────────────────────────────────────────
// Scoring: genre overlap (3pts each) + tag overlap (2pts each) + bookmark status (1pt)
// Excludes manga the user has already read or explicitly bookmarked as "completed/dropped"
// Cold-start fallback: return popular manga when no history exists

async function getRecommendations(userId: string): Promise<any[]> {
  // Fetch user signals in parallel
  const [history, bookmarks, ratings] = await Promise.all([
    prisma.readingHistory.findMany({
      where: { userId },
      orderBy: { lastReadAt: "desc" },
      take: 20,
      select: { mangaId: true, isCompleted: true },
    }),
    prisma.bookmark.findMany({
      where: { userId },
      select: { mangaId: true, status: true },
    }),
    prisma.rating.findMany({
      where: { userId, rating: { gte: 4 } },
      select: { mangaId: true, rating: true },
    }),
  ]);

  // All manga the user has interacted with
  const interactedIds = new Set([
    ...history.map((h) => h.mangaId),
    ...bookmarks.map((b) => b.mangaId),
  ]);

  // Cold-start: no history → return popular manga
  if (interactedIds.size === 0) {
    return prisma.manga.findMany({
      where: { isDraft: false },
      select: MANGA_CARD_SELECT,
      orderBy: { bookmarkCount: "desc" },
      take: 12,
    });
  }

  // Signal set: history + highly-rated manga
  const signalIds = [
    ...history.map((h) => h.mangaId),
    ...ratings.map((r) => r.mangaId),
  ];

  // Fetch genres and tags for signal manga in parallel
  const [genreCounts, tagCounts] = await Promise.all([
    prisma.genreManga.groupBy({
      by: ["genreId"],
      where: { mangaId: { in: signalIds } },
      _count: { genreId: true },
      orderBy: { _count: { genreId: "desc" } },
      take: 8,
    }),
    prisma.tagManga.groupBy({
      by: ["tagId"],
      where: { mangaId: { in: signalIds } },
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 8,
    }),
  ]);

  const topGenreIds = genreCounts.map((g) => g.genreId);
  const topTagIds = tagCounts.map((t) => t.tagId);

  if (topGenreIds.length === 0 && topTagIds.length === 0) {
    // Fallback to popular if no signals
    return prisma.manga.findMany({
      where: { isDraft: false, id: { notIn: Array.from(interactedIds) } },
      select: MANGA_CARD_SELECT,
      orderBy: { bookmarkCount: "desc" },
      take: 12,
    });
  }

  // Fetch candidates matching top genres OR tags, excluding interacted
  const candidates = await prisma.manga.findMany({
    where: {
      isDraft: false,
      id: { notIn: Array.from(interactedIds) },
      OR: [
        ...(topGenreIds.length > 0 ? [{ genres: { some: { genreId: { in: topGenreIds } } } }] : []),
        ...(topTagIds.length > 0 ? [{ tags: { some: { tagId: { in: topTagIds } } } }] : []),
      ],
    },
    select: {
      ...MANGA_CARD_SELECT,
      genres: { select: { genreId: true, genre: { select: { name: true, slug: true } } } },
      tags: { select: { tagId: true } },
    },
    take: 60,
    orderBy: { bookmarkCount: "desc" },
  });

  // Build genre/tag score maps
  const genreScoreMap = new Map(genreCounts.map((g) => [g.genreId, g._count.genreId]));
  const tagScoreMap = new Map(tagCounts.map((t) => [t.tagId, t._count.tagId]));

  // Score candidates
  const scored = candidates.map((m) => {
    let score = 0;
    m.genres.forEach((g) => {
      score += (genreScoreMap.get(g.genreId) ?? 0) * 3;
    });
    m.tags.forEach((t) => {
      score += (tagScoreMap.get(t.tagId) ?? 0) * 2;
    });
    // Boost for high average rating
    if (m.averageRating >= 4.5) score += 5;
    else if (m.averageRating >= 4.0) score += 3;
    return { manga: m, score };
  });

  // Sort by score desc, return top 12 with correct shape (strip internal genreId)
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ manga }) => ({
      ...manga,
      genres: manga.genres.map((g) => ({ genre: g.genre })),
    }));
}

// ─── Components ───────────────────────────────────────────────────────────────

function MangaCard({ manga, priority = false }: { manga: any; priority?: boolean }) {
  return (
    <Link href={`/manga/${manga.slug}`} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group-hover:border-indigo-500/40 transition-all duration-300 shadow-md group-hover:shadow-xl group-hover:shadow-indigo-900/20">
        {manga.coverImage ? (
          <Image
            src={manga.coverImage}
            alt={`${manga.title} manga cover`}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800" aria-label="No cover image">
            <BookOpen className="w-8 h-8 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {manga.isTrending && (
            <span className="text-[10px] font-bold bg-orange-500/90 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 backdrop-blur-sm">
              <Flame className="w-2.5 h-2.5" aria-hidden="true" /> Hot
            </span>
          )}
          {manga.status === "COMPLETED" && (
            <span className="text-[10px] font-bold bg-emerald-500/90 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
              END
            </span>
          )}
        </div>

        {/* Chapter / Rating hover overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between text-xs text-slate-200">
            {manga.chapters?.[0] && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Ch.{manga.chapters[0].chapterNumber}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {manga.averageRating > 0 ? manga.averageRating.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 group-hover:text-indigo-300 transition-colors leading-tight">
          {manga.title}
        </h3>
        {manga.genres?.[0] && (
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {manga.genres.map((g: any) => g.genre.name).join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}

function SectionHeader({
  title,
  href,
  icon: Icon,
  subtitle,
}: {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20" aria-hidden="true">
            <Icon className="w-5 h-5 text-indigo-400" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium group"
          aria-label={`View all ${title}`}
        >
          View All
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function MangaRow({
  manga,
  title,
  href,
  icon,
  subtitle,
}: {
  manga: any[];
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}) {
  if (!manga || manga.length === 0) return null;
  return (
    <section className="mb-14" aria-label={title}>
      <SectionHeader title={title} href={href} icon={icon} subtitle={subtitle} />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
        {manga.map((m: any, i: number) => (
          <MangaCard key={m.id} manga={m} priority={i < 3} />
        ))}
      </div>
    </section>
  );
}

function SkeletonRow() {
  return (
    <div className="mb-14" aria-hidden="true">
      <div className="h-8 bg-slate-800/50 rounded-lg w-48 mb-5 animate-pulse" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] bg-slate-800/50 rounded-xl animate-pulse" />
            <div className="h-4 bg-slate-800/30 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function HeroCarousel({ featured }: { featured: any[] }) {
  if (featured.length === 0) return <SimpleHero />;

  const hero = featured[0];
  return (
    <section className="relative min-h-[70vh] flex items-end overflow-hidden mb-16" aria-label="Featured manga">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src={hero.bannerImage || hero.coverImage}
          alt={`${hero.title} banner`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
        <div className="max-w-xl">
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Genres">
            {hero.genres.slice(0, 3).map((g: any) => (
              <Badge key={g.genre.name} variant="secondary" className="text-xs">
                {g.genre.name}
              </Badge>
            ))}
            {hero.status === "COMPLETED" && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                Completed
              </Badge>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 leading-tight">{hero.title}</h1>
          {hero.synopsis && (
            <p className="text-slate-300 text-sm sm:text-base line-clamp-3 mb-6">{hero.synopsis}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href={`/manga/${hero.slug}`}>
              <button
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                aria-label={`Read ${hero.title}`}
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                Read Now
              </button>
            </Link>
            {hero.chapters[0] && (
              <Link href={`/read/${hero.slug}/chapter-${hero.chapters[0].chapterNumber}`}>
                <button
                  className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl backdrop-blur-sm transition-colors border border-slate-700 flex items-center gap-2"
                  aria-label={`Start from Chapter ${hero.chapters[0].chapterNumber}`}
                >
                  <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  Ch. {hero.chapters[0].chapterNumber}
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Featured thumbnails strip */}
        {featured.length > 1 && (
          <div className="flex gap-3 mt-8 overflow-x-auto no-scrollbar pb-1" aria-label="Other featured manga">
            {featured.slice(1).map((m) => (
              <Link key={m.id} href={`/manga/${m.slug}`} className="shrink-0 group" aria-label={m.title}>
                <div className="relative w-20 h-28 rounded-lg overflow-hidden border-2 border-transparent group-hover:border-indigo-500 transition-colors">
                  <Image
                    src={m.coverImage}
                    alt={`${m.title} cover`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SimpleHero() {
  return (
    <section
      className="relative py-24 flex items-center justify-center overflow-hidden mb-16"
      aria-label="Welcome banner"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-slate-950/80 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950/60 to-slate-950" />
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1 className="text-5xl sm:text-7xl font-bold mb-6">
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Read Manga
          </span>
          <br />
          <span className="text-white">Without Limits</span>
        </h1>
        <p className="text-lg text-slate-400 mb-8">
          Discover thousands of manga titles. Read the latest chapters and join our community.
        </p>
        <Link href="/search">
          <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors text-lg">
            Explore Manga
          </button>
        </Link>
      </div>
    </section>
  );
}

// ─── Latest Chapters ──────────────────────────────────────────────────────────

function LatestChaptersSection({ chapters }: { chapters: any[] }) {
  if (chapters.length === 0) return null;
  return (
    <section className="mb-14" aria-label="Latest chapter updates">
      <SectionHeader
        title="Latest Chapters"
        icon={Clock}
        href="/search?sortBy=updated"
        subtitle="Freshest updates"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {chapters.map((ch) => (
          <Link
            key={ch.id}
            href={`/read/${ch.manga.slug}/chapter-${ch.chapterNumber}`}
            className="group flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all"
            aria-label={`${ch.manga.title} Chapter ${ch.chapterNumber}`}
          >
            <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-800">
              {ch.manga.coverImage && (
                <Image
                  src={ch.manga.coverImage}
                  alt={`${ch.manga.title} cover`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                {ch.manga.title}
              </p>
              <p className="text-xs text-indigo-400 font-medium mt-0.5">
                Chapter {ch.chapterNumber}
                {ch.title ? ` — ${ch.title}` : ""}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                <time dateTime={ch.createdAt}>{formatDistanceToNow(new Date(ch.createdAt))} ago</time>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Announcements ────────────────────────────────────────────────────────────

const announcementStyles: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
};

function AnnouncementsSection({ announcements }: { announcements: any[] }) {
  if (announcements.length === 0) return null;
  return (
    <section className="mb-14" aria-label="Site announcements">
      <SectionHeader title="Announcements" icon={Megaphone} />
      <div className="space-y-3" role="list">
        {announcements.map((a) => (
          <div
            key={a.id}
            role="listitem"
            className={`p-4 rounded-xl border ${announcementStyles[a.type] ?? announcementStyles.info}`}
          >
            <p className="font-semibold text-sm">{a.title}</p>
            <p className="text-xs mt-1 opacity-80 line-clamp-2">{a.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Genres ───────────────────────────────────────────────────────────────────

function GenresSection({ genres }: { genres: any[] }) {
  if (genres.length === 0) return null;
  return (
    <section className="mb-14" aria-label="Browse by genre">
      <SectionHeader title="Browse by Genre" icon={Tag} />
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Link key={genre.id} href={`/search?genres=${genre.slug}`}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all group cursor-pointer">
              <span className="text-sm font-medium text-slate-300 group-hover:text-indigo-300 transition-colors">
                {genre.name}
              </span>
              <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                {genre._count.manga}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Continue Reading ─────────────────────────────────────────────────────────

function ContinueReadingSection({ items }: { items: any[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-14" aria-label="Continue reading">
      <SectionHeader
        title="Continue Reading"
        icon={BookOpen}
        subtitle="Pick up where you left off"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/read/${item.manga.slug}/chapter-${item.chapter.chapterNumber}`}
            className="group block"
            aria-label={`Continue ${item.manga.title} at Chapter ${item.chapter.chapterNumber}`}
          >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group-hover:border-indigo-500/50 transition-all">
              {item.manga.coverImage && (
                <Image
                  src={item.manga.coverImage}
                  alt={`${item.manga.title} cover`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, 16vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-[11px] font-bold text-indigo-300">Ch. {item.chapter.chapterNumber}</p>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-300 group-hover:text-indigo-300 line-clamp-2 mt-2 transition-colors">
              {item.manga.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── JSON-LD Structured Data ──────────────────────────────────────────────────

function WebSiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hentography",
    url: "https://hentography.com",
    description:
      "Read the latest manga online for free at Hentography. Discover new series, track your progress, and join our community.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://hentography.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

async function HomeContent() {
  const { userId: clerkId } = await auth();

  // Fetch public data + user-specific data in parallel
  const dbUserPromise = clerkId
    ? prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    : Promise.resolve(null);

  const [data, dbUser] = await Promise.all([getData(), dbUserPromise]);

  const [continueReading, recommendations] = await Promise.all([
    dbUser ? getContinueReading(dbUser.id) : Promise.resolve([]),
    dbUser ? getRecommendations(dbUser.id) : Promise.resolve([]),
  ]);

  const {
    featured,
    trending,
    popular,
    recentlyUpdated,
    highestRated,
    mostViewed,
    completed,
    ongoing,
    newReleases,
    latestChapters,
    genres,
    announcements,
  } = data;

  return (
    <>
      <WebSiteJsonLd />
      <HeroCarousel featured={featured} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnnouncementsSection announcements={announcements} />

        {continueReading.length > 0 && (
          <ContinueReadingSection items={continueReading} />
        )}

        {recommendations.length > 0 && (
          <MangaRow
            manga={recommendations}
            title="Recommended for You"
            href="/search"
            icon={Star}
            subtitle="Curated from your reading history and ratings"
          />
        )}

        <MangaRow
          manga={trending}
          title="Trending Now"
          href="/search?sortBy=views&trending=1"
          icon={TrendingUp}
          subtitle="Most popular this week"
        />
        <MangaRow
          manga={popular}
          title="Most Popular"
          href="/search?sortBy=popularity"
          icon={Flame}
          subtitle="All-time community favourites"
        />

        <LatestChaptersSection chapters={latestChapters} />

        <MangaRow
          manga={recentlyUpdated}
          title="Recently Updated"
          href="/search?sortBy=updated"
          icon={Zap}
          subtitle="Fresh chapters added this week"
        />

        {/* Mid-page Ad */}
        <div className="mb-14">
          <AdSlot position="HOME_HERO" />
        </div>

        <MangaRow
          manga={highestRated}
          title="Highest Rated"
          href="/search?sortBy=rating"
          icon={Award}
          subtitle="Top rated by our community"
        />
        <MangaRow
          manga={mostViewed}
          title="Most Viewed"
          href="/search?sortBy=views"
          icon={Eye}
          subtitle="All-time view leaders"
        />
        <MangaRow
          manga={newReleases}
          title="New Releases"
          href="/search?sortBy=newest"
          icon={Zap}
          subtitle="Released in the last 30 days"
        />
        <MangaRow
          manga={ongoing}
          title="Ongoing Series"
          href="/search?status=ONGOING"
          icon={BookOpen}
          subtitle="Currently being updated"
        />
        <MangaRow
          manga={completed}
          title="Completed Manga"
          href="/search?status=COMPLETED"
          icon={CheckCircle}
          subtitle="Fully finished stories — binge-read without wait"
        />

        <GenresSection genres={genres} />

        {/* Bottom Ad */}
        <div className="mb-14">
          <AdSlot position="HOME_HERO" />
        </div>
      </div>
    </>
  );
}

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 pb-16">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8" aria-label="Loading content">
            <div className="h-[60vh] bg-slate-900/50 animate-pulse rounded-2xl mb-16" />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </main>
  );
}
