import { User } from '@prisma/client';
import { redirect } from 'remix';
import { prisma } from '~/lib/prisma.server';
import { sessionStorage } from '~/lib/sessions.server';

// Extract the user id from the session, returning null if the user isn't logged in
// Note that this is the User.id field in the database, not the Spotify user id
export async function getUserId(request: Request): Promise<number | null> {
  const session = await sessionStorage.getSession(
    request.headers.get('Cookie'),
  );
  const userId: unknown = session.get('userId');
  return typeof userId === 'number' ? userId : null;
}

// Variant of getUserId that throws a redirect to the login page if the user is logged out
// and returns the user id otherwise
export async function ensureAuthenticated(request: Request): Promise<number> {
  const userId = await getUserId(request);
  if (userId === null) {
    throw redirect(
      `/auth/login?redirect=${encodeURIComponent(
        new URL(request.url).pathname,
      )}`,
    );
  }

  return userId;
}

// Extract the user from the session, returning null if the user isn't logged in
// or refers to a user that is missing in the database
export async function getUser(request: Request): Promise<User | null> {
  const userId = await getUserId(request);
  if (userId === null) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
  });
}

// Variant of getUser that throws a redirect to the login page if the user is logged out
// and returns the user otherwise
export async function ensureUser(request: Request): Promise<User> {
  const user = await getUser(request);
  if (!user) {
    throw redirect(
      `/auth/login?redirect=${encodeURIComponent(
        new URL(request.url).pathname,
      )}`,
    );
  }

  return user;
}
