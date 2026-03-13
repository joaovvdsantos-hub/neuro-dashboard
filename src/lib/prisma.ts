// Prisma client singleton
// Will be configured once DATABASE_URL is set up with a Prisma adapter

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

export function getPrisma() {
  if (!prisma) {
    throw new Error("Database not configured. Set DATABASE_URL and configure Prisma adapter.");
  }
  return prisma;
}

export { prisma };
