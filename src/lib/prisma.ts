import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { SEED_DB_BASE64 } from "./db-seed";

const SUPABASE_FALLBACK_URL = "postgresql://postgres.duoczpobjcikbzrwcozh:Meridian%401234%40m@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.DATABASE_URL || SUPABASE_FALLBACK_URL;
  process.env.DATABASE_URL = dbUrl;
  process.env.DIRECT_URL = process.env.DIRECT_URL || SUPABASE_FALLBACK_URL;
  const isPostgres = dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isPostgres) {
    // Persistent Cloud PostgreSQL (Supabase / Neon / Railway / Vercel Postgres)
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  // On Vercel / AWS Lambda, the root filesystem is read-only.
  // SQLite must use /tmp to be writable and avoid "Error code 14: Unable to open database file".
  if (isServerless && (!dbUrl || dbUrl.startsWith("file:"))) {
    const tmpDbPath = path.join("/tmp", "dev.db");

    if (!fs.existsSync(tmpDbPath)) {
      let copied = false;
      const candidates = [
        path.join(process.cwd(), "dev.db"),
        path.join(process.cwd(), "prisma", "dev.db"),
        path.join(__dirname, "dev.db"),
        path.join(__dirname, "..", "dev.db"),
        path.join(__dirname, "..", "prisma", "dev.db"),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            fs.copyFileSync(candidate, tmpDbPath);
            copied = true;
            console.log(`[Prisma] Seeded /tmp/dev.db from candidate: ${candidate}`);
            break;
          } catch (e) {
            console.warn("Could not copy dev.db candidate:", candidate, e);
          }
        }
      }

      // If file candidates were not traced or found, write from embedded base64 snapshot
      if (!copied && SEED_DB_BASE64) {
        try {
          fs.writeFileSync(tmpDbPath, Buffer.from(SEED_DB_BASE64, "base64"));
          console.log(`[Prisma] Initialized /tmp/dev.db from embedded base64 snapshot`);
        } catch (b64Err) {
          console.error("Failed to write embedded database to /tmp:", b64Err);
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      dbUrl = `file:${tmpDbPath}`;
      process.env.DATABASE_URL = dbUrl;
    }
  }

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
