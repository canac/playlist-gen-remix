import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var prisma: PrismaClient;
}

let client: PrismaClient;
if (process.env.NODE_ENV === 'production') {
  client = new PrismaClient();
} else {
  // In development mode, store the prisma client on the global object instead
  // of creating a new one every time the Remix dev server reloads, causing
  // the database to run out of connections
  // Reference: https://remix.run/docs/en/v1/other-api/serve
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }

  client = global.prisma;
}

// Export a single prisma client instance used throughout the application to
// avoid running out of database connections
export const prisma = client;
