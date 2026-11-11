import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.DATABASE_URL;

  // On Vercel / AWS Lambda, the root filesystem is read-only.
  // SQLite must use /tmp to be writable and avoid "Error code 14: Unable to open database file".
  if (process.env.VERCEL && (!dbUrl || dbUrl.startsWith("file:"))) {
    const tmpDbPath = path.join("/tmp", "dev.db");

    if (!fs.existsSync(tmpDbPath)) {
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
            break;
          } catch (e) {
            console.warn("Could not copy dev.db candidate:", candidate, e);
          }
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      dbUrl = `file:${tmpDbPath}`;
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
