import { MetadataRoute } from 'next';
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Get all published manga
  const mangas = await prisma.manga.findMany({
    where: { isDraft: false },
    select: { slug: true, updatedAt: true },
  });

  // Get all published chapters
  const chapters = await prisma.chapter.findMany({
    where: { isPublished: true },
    select: { chapterNumber: true, updatedAt: true, manga: { select: { slug: true } } },
  });

  const mangaUrls = mangas.map((manga) => ({
    url: `${baseUrl}/manga/${manga.slug}`,
    lastModified: manga.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const chapterUrls = chapters.map((chapter) => ({
    url: `${baseUrl}/read/${chapter.manga.slug}/chapter-${chapter.chapterNumber}`,
    lastModified: chapter.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...mangaUrls,
    ...chapterUrls,
  ];
}
