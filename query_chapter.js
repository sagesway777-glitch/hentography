require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // The chapter was deleted as part of the test (cascade from manga delete in step 18)
  // But we can query the manga list and check the most recent history entry
  const manga = await prisma.manga.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, slug: true, title: true, isDraft: true, createdAt: true }
  });
  console.log('Most recent 5 manga:');
  console.log(JSON.stringify(manga, null, 2));

  // Also check ReadingHistory to prove the chapter existed and was read
  const history = await prisma.readingHistory.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { id: true, chapterId: true, mangaId: true, updatedAt: true }
  });
  console.log('Most recent 5 reading history entries:');
  console.log(JSON.stringify(history, null, 2));
}

main().then(() => pool.end()).catch(e => { console.error(e); pool.end(); });
