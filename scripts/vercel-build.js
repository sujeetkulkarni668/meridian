const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

if (isPostgres) {
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schemaContent);
  console.log('[Vercel Build] Detected PostgreSQL database. Configured prisma/schema.prisma datasource provider to "postgresql".');
} else {
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schemaContent);
  console.log('[Vercel Build] Configured prisma/schema.prisma datasource provider to "sqlite".');
}

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

if (!isPostgres) {
  // Ensure SQLite file is mirrored and embedded
  try {
    if (fs.existsSync('./dev.db') && !fs.existsSync('./prisma/dev.db')) {
      fs.copyFileSync('./dev.db', './prisma/dev.db');
    } else if (fs.existsSync('./prisma/dev.db') && !fs.existsSync('./dev.db')) {
      fs.copyFileSync('./prisma/dev.db', './dev.db');
    }

    const dbPath = fs.existsSync('./prisma/dev.db') ? './prisma/dev.db' : './dev.db';
    if (fs.existsSync(dbPath)) {
      const dbBuffer = fs.readFileSync(dbPath);
      const b64 = dbBuffer.toString('base64');
      const seedContent = `// Auto-generated SQLite seed snapshot for Vercel Serverless Lambdas\nexport const SEED_DB_BASE64 = "${b64}";\n`;
      fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'db-seed.ts'), seedContent);
      console.log(`[Vercel Build] Seed database embedded into src/lib/db-seed.ts (${dbBuffer.length} bytes)`);
    }
  } catch (e) {
    console.warn('[Vercel Build] DB sync warning:', e.message);
  }
} else {
  // For PostgreSQL, provide placeholder export so import doesn't fail
  fs.writeFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'db-seed.ts'),
    `export const SEED_DB_BASE64 = "";\n`
  );
}

console.log('[Vercel Build] 4. Running Next.js production build...');
execSync('npx next build', { stdio: 'inherit', env: process.env });
console.log('[Vercel Build] Build finished successfully!');
