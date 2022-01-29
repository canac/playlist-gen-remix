import { PrismaClient } from '@prisma/client';

// Export a single prisma client instance used throughout the application to
// avoid running out of database connections
export const prisma = new PrismaClient();
