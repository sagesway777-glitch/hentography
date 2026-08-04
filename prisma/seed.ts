import prisma from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Starting seed...')

  // 1. Create Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hentaiplus.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
  
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      username: 'admin',
      clerkId: `admin_${adminEmail}`,
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  
  console.log(`Admin user created/updated: ${admin.email}`)

  // 2. Create Default Site Settings
  const defaultSettings = [
    { key: 'site_name', value: 'HentaiPlus', description: 'Name of the website' },
    { key: 'site_description', value: 'Your ultimate manga reading platform.', description: 'SEO Description' },
    { key: 'contact_email', value: 'contact@hentaiplus.com', description: 'Public contact email' },
    { key: 'allow_registration', value: 'true', type: 'boolean', description: 'Allow new user registration' },
  ]

  for (const setting of defaultSettings) {
    await prisma.siteSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('Site settings seeded')

  // 3. Create Basic Genres
  const genres = [
    { name: 'Action', slug: 'action', description: 'Action-packed stories' },
    { name: 'Romance', slug: 'romance', description: 'Love and relationships' },
    { name: 'Comedy', slug: 'comedy', description: 'Humorous content' },
    { name: 'Drama', slug: 'drama', description: 'Emotional narratives' },
    { name: 'Fantasy', slug: 'fantasy', description: 'Magical and mythical worlds' },
    { name: 'Sci-Fi', slug: 'sci-fi', description: 'Science fiction' },
    { name: 'Slice of Life', slug: 'slice-of-life', description: 'Everyday life' },
    { name: 'Horror', slug: 'horror', description: 'Scary stories' },
    { name: 'Mystery', slug: 'mystery', description: 'Suspenseful plots' },
    { name: 'Adventure', slug: 'adventure', description: 'Journeys and exploration' },
  ]

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    })
  }
  console.log(`Seeded ${genres.length} genres`)

  // 4. Create Initial Themes
  const themes = [
    { name: 'School Life', slug: 'school-life' },
    { name: 'Supernatural', slug: 'supernatural' },
    { name: 'Martial Arts', slug: 'martial-arts' },
    { name: 'Isekai', slug: 'isekai' },
    { name: 'Magic', slug: 'magic' },
  ]
  for (const theme of themes) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: {},
      create: theme,
    })
  }
  console.log(`Seeded ${themes.length} themes`)
  
  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
