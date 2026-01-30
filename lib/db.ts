// lib/db.ts
import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use existing Prisma instance if it exists (dev hot-reload), otherwise create a new one
export const db =
  global.prisma ||
  new PrismaClient({
    log: ["query"], 
  });

  

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}