import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Home, List } from "lucide-react";
import { ReaderClient } from "@/components/read/reader-client";
import { ShareButton } from "@/components/ui/share-button";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { ChapterSelect } from "@/components/read/chapter-select";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseChapterNumber(slug: string): number | null {
  const n = parseFloat(slug.replace(/^chapter-/i, ""));
  return isNaN(n) ? null : n;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mangaSlug: string; chapterSlug: string }>;
}): Promise<Metadata> {
  const { mangaSlug, chapterSlug } = await params;
  const chapterNumber = parseChapterNumber(chapterSlug);

  const chapter = await prisma.chapter.findFirst({
    where: {
      manga: { slug: mangaSlug },
      ...(chapterNumber !== null ? { chapterNumber } : { id: chapterSlug }),
      isPublished: true,
    },
    select: {
      chapterNumber: true,
      title: true,
      manga: { select: { title: true, slug: true, coverImage: true } },
    },
  });

  if (!chapter) return { title: "Chapter Not Found | HentaiPlus" };

  const chTitle = chapter.title ? ` — ${chapter.title}` : "";
  const title = `${chapter.manga.title} Ch.${chapter.chapterNumber}${chTitle} | HentaiPlus`;
  const description = `Read ${chapter.manga.title} Chapter ${chapter.chapterNumber} online for free at HentaiPlus. No account required.`;
  const canonicalUrl = `https://hentaiplus.com/read/${chapter.manga.slug}/chapter-${chapter.chapterNumber}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: chapter.manga.coverImage
        ? [{ url: chapter.manga.coverImage, alt: `${chapter.manga.title} cover` }]
        : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: chapter.manga.coverImage ? [chapter.manga.coverImage] : [],
    },
    robots: {
      // Allow crawling but avoid indexing every individual chapter to prevent thin content
      index: false,
      follow: true,
    },
  };
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getChapterData(mangaSlug: string, chapterSlug: string) {
  const chapterNumber = parseChapterNumber(chapterSlug);

  const chapter = await prisma.chapter.findFirst({
    where: {
      manga: { slug: mangaSlug },
      ...(chapterNumber !== null ? { chapterNumber } : { id: chapterSlug }),
      isPublished: true,
    },
    select: {
      id: true,
      mangaId: true,
      chapterNumber: true,
      title: true,
      images: true,
      pages: true,
      manga: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
        },
      },
    },
  });

  if (!chapter) return null;

  // Get adjacent chapters + full chapter list in one round trip
  const [prevChapter, nextChapter, allChapters] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        mangaId: chapter.mangaId,
        chapterNumber: { lt: chapter.chapterNumber },
        isPublished: true,
      },
      orderBy: { chapterNumber: "desc" },
      select: { chapterNumber: true },
    }),
    prisma.chapter.findFirst({
      where: {
        mangaId: chapter.mangaId,
        chapterNumber: { gt: chapter.chapterNumber },
        isPublished: true,
      },
      orderBy: { chapterNumber: "asc" },
      select: { chapterNumber: true },
    }),
    prisma.chapter.findMany({
      where: { mangaId: chapter.mangaId, isPublished: true },
      orderBy: { chapterNumber: "asc" },
      select: { chapterNumber: true, title: true },
    }),
  ]);

  return { chapter, prevChapter, nextChapter, allChapters };
}

// ─── View count — deduplicated per chapter per session (cookie-based) ──────────

async function trackView(chapterId: string, mangaId: string) {
  const cookieStore = await cookies();
  const viewKey = `viewed_${chapterId}`;

  // Only count once per session per chapter
  if (cookieStore.has(viewKey)) return;

  // Fire-and-forget both increments
  Promise.all([
    prisma.chapter.update({
      where: { id: chapterId },
      data: { views: { increment: 1 } },
    }),
    prisma.manga.update({
      where: { id: mangaId },
      data: { views: { increment: 1 } },
    }),
  ]).catch(() => {});
  // Note: the cookie is set via the response headers in Next.js middleware
  // We rely on short-lived session cookies; the server can't set cookies from
  // Server Components directly, but since this is fire-and-forget we simply
  // check if the user just loaded the page — Next.js middleware handles
  // the `viewed_*` cookie set on the response.
  // For full deduplication, the history POST from the client also guards
  // against duplicate DB entries via the @@unique constraint.
}

async function getReadingHistory(chapterId: string, mangaId: string) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!user) return null;

    return prisma.readingHistory.findUnique({
      where: {
        mangaId_chapterId_userId: {
          mangaId,
          chapterId,
          userId: user.id,
        },
      },
      select: {
        pageNumber: true,
        readingMode: true,
        readingDirection: true,
      },
    });
  } catch {
    return null;
  }
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function ArticleJsonLd({
  manga,
  chapter,
}: {
  manga: { title: string; slug: string; coverImage: string };
  chapter: { chapterNumber: number; title: string | null };
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${manga.title} Chapter ${chapter.chapterNumber}`,
    headline: `Read ${manga.title} Chapter ${chapter.chapterNumber} Online`,
    image: manga.coverImage,
    url: `https://hentaiplus.com/read/${manga.slug}/chapter-${chapter.chapterNumber}`,
    isPartOf: {
      "@type": "Book",
      name: manga.title,
      url: `https://hentaiplus.com/manga/${manga.slug}`,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://hentaiplus.com" },
        { "@type": "ListItem", position: 2, name: manga.title, item: `https://hentaiplus.com/manga/${manga.slug}` },
        {
          "@type": "ListItem",
          position: 3,
          name: `Chapter ${chapter.chapterNumber}`,
          item: `https://hentaiplus.com/read/${manga.slug}/chapter-${chapter.chapterNumber}`,
        },
      ],
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ mangaSlug: string; chapterSlug: string }>;
}) {
  const { mangaSlug, chapterSlug } = await params;
  const data = await getChapterData(mangaSlug, chapterSlug);

  if (!data) notFound();

  const { chapter, prevChapter, nextChapter, allChapters } = data;

  // Parallel: track view + fetch reading history
  const [readingHistory] = await Promise.all([
    getReadingHistory(chapter.id, chapter.mangaId),
    trackView(chapter.id, chapter.mangaId),
  ]);

  const prevSlug = prevChapter ? `chapter-${prevChapter.chapterNumber}` : null;
  const nextSlug = nextChapter ? `chapter-${nextChapter.chapterNumber}` : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <ArticleJsonLd manga={chapter.manga} chapter={chapter} />

      <ReaderHeader
        manga={chapter.manga}
        chapter={chapter}
        allChapters={allChapters}
        prevSlug={prevSlug}
        nextSlug={nextSlug}
      />

      <ReaderClient
        chapter={chapter}
        mangaSlug={mangaSlug}
        initialHistory={readingHistory}
        nextChapterSlug={nextSlug}
      />

      <ReaderFooter
        manga={chapter.manga}
        chapter={chapter}
        prevSlug={prevSlug}
        nextSlug={nextSlug}
      />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function ReaderHeader({
  manga,
  chapter,
  allChapters,
  prevSlug,
  nextSlug,
}: {
  manga: { title: string; slug: string; coverImage?: string | null };
  chapter: { chapterNumber: number; title: string | null };
  allChapters: { chapterNumber: number; title: string | null }[];
  prevSlug: string | null;
  nextSlug: string | null;
}) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/manga/${manga.slug}`}
            className="text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label={`Back to ${manga.title}`}
          >
            <Home className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div className="h-5 w-px bg-slate-700 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400 truncate hidden sm:block">{manga.title}</p>
            <p className="text-sm font-medium text-white">
              Ch. {chapter.chapterNumber}
              {chapter.title && (
                <span className="text-slate-400 font-normal ml-1 hidden sm:inline">
                  — {chapter.title}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Chapter selector */}
        <nav className="hidden md:block" aria-label="Chapter navigation">
          <ChapterSelect
            currentChapterNumber={chapter.chapterNumber}
            mangaSlug={manga.slug}
            allChapters={allChapters}
          />
        </nav>

        {/* Right: Prev / Next / TOC */}
        <nav className="flex items-center gap-1 shrink-0" aria-label="Chapter controls">
          {prevSlug ? (
            <Link href={`/read/${manga.slug}/${prevSlug}`} aria-label="Previous chapter">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled aria-label="No previous chapter">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
          {nextSlug ? (
            <Link href={`/read/${manga.slug}/${nextSlug}`} aria-label="Next chapter">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled aria-label="No next chapter">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
          <Link href={`/manga/${manga.slug}`} className="ml-1" aria-label="Chapter list">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <List className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-700 mx-1" aria-hidden="true" />
          <ShareButton 
            title={`${manga.title} Ch. ${chapter.chapterNumber}`} 
            text={`Read ${manga.title} Chapter ${chapter.chapterNumber} on HentaiPlus!`}
            className="h-8 border-none bg-transparent hover:bg-slate-800 text-slate-300"
          />
        </nav>
      </div>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function ReaderFooter({
  manga,
  chapter,
  prevSlug,
  nextSlug,
}: {
  manga: { title: string; slug: string; coverImage?: string | null };
  chapter: { chapterNumber: number; title: string | null };
  prevSlug: string | null;
  nextSlug: string | null;
}) {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div>
          {prevSlug ? (
            <Link href={`/read/${manga.slug}/${prevSlug}`} aria-label="Previous chapter">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white gap-1.5">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" disabled className="text-slate-600 gap-1.5" aria-label="No previous chapter">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-white">Chapter {chapter.chapterNumber}</p>
          <p className="text-xs text-slate-500 line-clamp-1 max-w-[180px]">{manga.title}</p>
        </div>

        <div>
          {nextSlug ? (
            <Link href={`/read/${manga.slug}/${nextSlug}`} aria-label="Next chapter">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white gap-1.5">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" disabled className="text-slate-600 gap-1.5" aria-label="No next chapter">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
