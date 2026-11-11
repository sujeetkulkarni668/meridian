const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';

console.log('[Vercel Build] 1. Generating Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit', env: process.env });

console.log('[Vercel Build] 2. Pushing database schema...');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: process.env });

console.log('[Vercel Build] 3. Seeding benchmark data...');
try {
  execSync('node prisma/seed.js', { stdio: 'inherit', env: process.env });
} catch (e) {
  console.warn('[Vercel Build] Seeding warning:', e.message);
}

// Ensure database file is mirrored to both root and prisma/ directory
try {
  if (fs.existsSync('./dev.db') && !fs.existsSync('./prisma/dev.db')) {
    fs.copyFileSync('./dev.db', './prisma/dev.db');
  } else if (fs.existsSync('./prisma/dev.db') && !fs.existsSync('./dev.db')) {
    fs.copyFileSync('./prisma/dev.db', './dev.db');
  }
} catch (e) {
  console.warn('[Vercel Build] DB sync warning:', e.message);
}

console.log('[Vercel Build] 4. Running Next.js production build...');
execSync('npx next build', { stdio: 'inherit', env: process.env });
console.log('[Vercel Build] Build finished successfully!');
