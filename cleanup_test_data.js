require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');

async function cleanup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const deleted = await prisma.manga.deleteMany({ where: { title: { contains: 'E2E Test' } } });
    console.log('Deleted E2E Test manga rows:', deleted.count);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

cleanup().catch(e => { console.error('Cleanup error:', e.message); process.exit(1); });
