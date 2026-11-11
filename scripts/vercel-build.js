const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure production environment for Next.js build
process.env.NODE_ENV = 'production';

// Load .env file into process.env if present
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[match[1]]) {
          process.env[match[1]] = val;
        }
      }
    }
  }
} catch (e) {}

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

if (isPostgres) {
  process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  if (!schemaContent.includes('directUrl')) {
    schemaContent = schemaContent.replace(
      'url      = env("DATABASE_URL")',
      'url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")'
    );
  }
  fs.writeFileSync(schemaPath, schemaContent);
  console.log('[Vercel Build] Detected PostgreSQL database. Configured prisma/schema.prisma datasource provider to "postgresql".');
} else {
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  schemaContent = schemaContent.replace(/\s*directUrl\s*=\s*env\("DIRECT_URL"\)/g, '');
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
