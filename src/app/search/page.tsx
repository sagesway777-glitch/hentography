import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Filter, Search, Star, Eye, TrendingUp } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Manga | Hentography",
  description:
    "Browse and filter our full collection of manga by genre, status, author, rating, and more. Find your next favourite series.",
  alternates: {
    canonical: "https://hentography.com/search",
  },
  openGraph: {
    title: "Search Manga | Hentography",
    description: "Browse and filter thousands of manga titles.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Search Manga | Hentography",
    description: "Browse and filter thousands of manga titles.",
  },
  robots: {
    // Dynamic search results should not be indexed to avoid thin content
    index: false,
    follow: true,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getFilterOptions() {
  const [genres, tags, themes, authors] = await Promise.all([
    prisma.genre.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.theme.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true }, take: 50 }),
  ]);
  return { genres, tags, themes, authors };
}

async function searchManga(params: Record<string, string | string[] | undefined>) {
  const q = typeof params.q === "string" ? params.q : "";
  const genres = (Array.isArray(params.genres) ? params.genres : params.genres ? [params.genres] : []);
  const tags = (Array.isArray(params.tags) ? params.tags : params.tags ? [params.tags] : []);
  const themes = (Array.isArray(params.themes) ? params.themes : params.themes ? [params.themes] : []);
  const status = typeof params.status === "string" && params.status ? params.status : undefined;
  const minRating = typeof params.minRating === "string" ? parseFloat(params.minRating) : undefined;
  const year = typeof params.year === "string" ? parseInt(params.year) : undefined;
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : "popularity";
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page)) : 1;
  const limit = 24;

  // ── Search implementation note ──────────────────────────────────────────────
  // We use Prisma `contains` with `mode: "insensitive"` which translates to
  // `ILIKE '%term%'` in PostgreSQL — case-insensitive substring matching.
  //
  // True PostgreSQL full-text search (tsvector/tsquery) is NOT implemented.
  // To upgrade: add a `searchVector tsvector` column via migration, populate it
  // via trigger, index it with `CREATE INDEX ON manga USING GIN(search_vector)`,
  // and query using Prisma.$queryRaw with `@@ to_tsquery(...)`. This would give
  // ranked results, stemming, and stop-word filtering at the cost of a schema
  // migration. The current ILIKE approach is sufficient for a small-to-medium
  // library (< 50k titles) but will show performance degradation above that.
  // ────────────────────────────────────────────────────────────────────────────

  const where: any = {
    isDraft: false,
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { alternativeTitles: { contains: q, mode: "insensitive" } },
        { synopsis: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(status && { status }),
    ...(minRating !== undefined && !isNaN(minRating) && { averageRating: { gte: minRating } }),
    ...(year !== undefined && !isNaN(year) && { releaseYear: year }),
    ...(genres.length > 0 && { genres: { some: { genre: { slug: { in: genres } } } } }),
    ...(tags.length > 0 && { tags: { some: { tag: { slug: { in: tags } } } } }),
    ...(themes.length > 0 && { themes: { some: { theme: { slug: { in: themes } } } } }),
  };

  let orderBy: any = { bookmarkCount: "desc" };
  switch (sortBy) {
    case "newest": orderBy = { createdAt: "desc" }; break;
    case "oldest": orderBy = { createdAt: "asc" }; break;
    case "alphabetical": orderBy = { title: "asc" }; break;
    case "views": orderBy = { views: "desc" }; break;
    case "rating": orderBy = { averageRating: "desc" }; break;
    case "updated": orderBy = { updatedAt: "desc" }; break;
  }

  const [manga, total] = await Promise.all([
    prisma.manga.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        status: true,
        averageRating: true,
        views: true,
        isTrending: true,
        releaseYear: true,
        chapters: {
          where: { isPublished: true },
          orderBy: { chapterNumber: "desc" },
          take: 1,
          select: { chapterNumber: true },
        },
        genres: { take: 2, include: { genre: { select: { name: true } } } },
        authors: { take: 1, include: { author: { select: { name: true } } } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.manga.count({ where }),
  ]);

  return { manga, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── MangaCard ────────────────────────────────────────────────────────────────

function MangaCard({ manga }: { manga: any }) {
  return (
    <Link href={`/manga/${manga.slug}`} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group-hover:border-indigo-500/40 transition-all duration-300 shadow-md group-hover:shadow-xl group-hover:shadow-indigo-900/20">
        {manga.coverImage ? (
          <Image
            src={manga.coverImage}
            alt={manga.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <BookOpen className="w-8 h-8 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Status badge */}
        {manga.status === "COMPLETED" && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-bold bg-emerald-500/90 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">END</span>
          </div>
        )}

        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
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
      <div className="mt-2">
        <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 group-hover:text-indigo-300 transition-colors leading-tight">
          {manga.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-slate-500 truncate">
            {manga.genres?.map((g: any) => g.genre.name).join(", ") || manga.status}
          </p>
          {manga.views > 0 && (
            <span className="text-[11px] text-slate-600 flex items-center gap-0.5 shrink-0 ml-1">
              <Eye className="w-3 h-3" />{manga.views > 1000 ? `${(manga.views / 1000).toFixed(1)}k` : manga.views}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ currentPage, totalPages, buildHref }: { currentPage: number; totalPages: number; buildHref: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pages.push(i);
  }
  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {currentPage > 1 && (
        <Link href={buildHref(currentPage - 1)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-700">
          ← Prev
        </Link>
      )}
      {pages[0] > 1 && (
        <>
          <Link href={buildHref(1)} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm transition-colors border border-slate-700">1</Link>
          {pages[0] > 2 && <span className="text-slate-600">…</span>}
        </>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
            p === currentPage
              ? "bg-indigo-600 text-white border-indigo-500"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
          }`}
        >
          {p}
        </Link>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="text-slate-600">…</span>}
          <Link href={buildHref(totalPages)} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm transition-colors border border-slate-700">{totalPages}</Link>
        </>
      )}
      {currentPage < totalPages && (
        <Link href={buildHref(currentPage + 1)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-700">
          Next →
        </Link>
      )}
    </div>
  );
}

// ─── Search Results (async server component) ──────────────────────────────────

async function SearchResults({ params }: { params: Record<string, string | string[] | undefined> }) {
  const result = await searchManga(params);
  const { manga, total, page, limit, totalPages } = result;

  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (k === "page") return;
      if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
      else if (v) sp.set(k, v);
    });
    if (p > 1) sp.set("page", String(p));
    return `/search?${sp.toString()}`;
  };

  if (manga.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Search className="w-16 h-16 text-slate-700 mb-5" />
        <h3 className="text-2xl font-bold text-slate-300 mb-2">No Results Found</h3>
        <p className="text-slate-500 mb-6">Try adjusting your search or filters</p>
        <Link href="/search" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
          Clear Filters
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-slate-400 mb-5">
        Showing <span className="text-white font-semibold">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> of{" "}
        <span className="text-white font-semibold">{total.toLocaleString()}</span> results
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {manga.map((m) => <MangaCard key={m.id} manga={m} />)}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
      {children}
    </div>
  );
}

async function FilterSidebar({ params }: { params: Record<string, string | string[] | undefined> }) {
  const { genres, tags, themes } = await getFilterOptions();

  const activeGenres = Array.isArray(params.genres) ? params.genres : params.genres ? [params.genres] : [];
  const activeTags = Array.isArray(params.tags) ? params.tags : params.tags ? [params.tags] : [];
  const activeStatus = typeof params.status === "string" ? params.status : "";
  const activeSortBy = typeof params.sortBy === "string" ? params.sortBy : "popularity";

  function buildToggleHref(key: string, value: string, isMulti = false) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (k === "page") return;
      if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
      else if (v) sp.set(k, v);
    });
    if (isMulti) {
      const existing = sp.getAll(key);
      if (existing.includes(value)) {
        sp.delete(key);
        existing.filter((v) => v !== value).forEach((v) => sp.append(key, v));
      } else {
        sp.append(key, value);
      }
    } else {
      if (sp.get(key) === value) sp.delete(key);
      else sp.set(key, value);
    }
    return `/search?${sp.toString()}`;
  }

  const statuses = [
    { value: "ONGOING", label: "Ongoing" },
    { value: "COMPLETED", label: "Completed" },
    { value: "HIATUS", label: "Hiatus" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const sortOptions = [
    { value: "popularity", label: "Popularity" },
    { value: "rating", label: "Highest Rated" },
    { value: "views", label: "Most Viewed" },
    { value: "newest", label: "Newest" },
    { value: "updated", label: "Recently Updated" },
    { value: "alphabetical", label: "A–Z" },
  ];

  return (
    <aside className="w-full lg:w-60 shrink-0">
      <div className="sticky top-24 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-white font-bold mb-5 pb-4 border-b border-slate-800">
          <Filter className="w-4 h-4" />
          Filters
        </div>

        <FilterSection label="Sort By">
          <div className="space-y-1">
            {sortOptions.map(({ value, label }) => (
              <Link key={value} href={buildToggleHref("sortBy", value)}>
                <div className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${activeSortBy === value ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>
                  {label}
                </div>
              </Link>
            ))}
          </div>
        </FilterSection>

        <FilterSection label="Status">
          <div className="flex flex-wrap gap-2">
            {statuses.map(({ value, label }) => (
              <Link key={value} href={buildToggleHref("status", value)}>
                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${activeStatus === value ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700"}`}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </FilterSection>

        <FilterSection label="Genres">
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
            {genres.map((g) => {
              const isActive = activeGenres.includes(g.slug);
              return (
                <Link key={g.id} href={buildToggleHref("genres", g.slug, true)}>
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${isActive ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700"}`}>
                    {g.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection label="Tags">
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {tags.slice(0, 30).map((t) => {
              const isActive = activeTags.includes(t.slug);
              return (
                <Link key={t.id} href={buildToggleHref("tags", t.slug, true)}>
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${isActive ? "bg-violet-500/20 text-violet-300 border border-violet-500/40" : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700"}`}>
                    {t.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </FilterSection>

        {(activeGenres.length > 0 || activeTags.length > 0 || activeStatus) && (
          <Link href="/search" className="block w-full text-center px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-sm font-medium transition-colors mt-4">
            Clear All Filters
          </Link>
        )}
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {q ? `Results for "${q}"` : "Browse Manga"}
          </h1>
          <p className="text-slate-400">
            {q ? "Search results from our full library" : "Discover your next favourite series"}
          </p>
        </div>

        {/* Search Bar */}
        <form method="GET" action="/search" className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by title, author, genre..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-2xl text-slate-200 placeholder-slate-500 outline-none transition-colors text-base"
            />
            {/* Preserve existing params except q and page */}
            {Object.entries(resolvedParams)
              .filter(([k]) => k !== "q" && k !== "page")
              .flatMap(([k, v]) =>
                Array.isArray(v)
                  ? v.map((val) => <input key={`${k}-${val}`} type="hidden" name={k} value={val} />)
                  : v
                  ? [<input key={k} type="hidden" name={k} value={v} />]
                  : []
              )}
          </div>
        </form>

        <div className="flex flex-col lg:flex-row gap-8">
          <Suspense fallback={<div className="w-60 h-96 bg-slate-900/50 rounded-2xl animate-pulse" />}>
            <FilterSidebar params={resolvedParams} />
          </Suspense>

          <div className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i}>
                      <div className="aspect-[2/3] bg-slate-800/50 rounded-xl animate-pulse" />
                      <div className="h-3 bg-slate-800/30 rounded mt-2 animate-pulse" />
                    </div>
                  ))}
                </div>
              }
            >
              <SearchResults params={resolvedParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
