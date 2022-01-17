import { PrismaClient, User } from '@prisma/client';
import { redirect } from 'remix';
import { getSession } from '~/sessions.server';

// Extract the user id from the session, returning null if the user isn't logged in
// Note that this is the User.id field in the database, not the Spotify user id
export async function getUserId(request: Request): Promise<number | null> {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  return typeof userId === 'number' ? userId : null;
}

// Ensure the the user is authenticated
// Return the user's unique id if they are logged in
// Throw a redirect to the login page if they aren't
export async function ensureAuthenticated(request: Request): Promise<number> {
  const userId = await getUserId(request);
  if (userId === null) {
    throw redirect('/auth/login');
  }

  return userId;
}

// Ensure the the user is authenticated and represents a valid user
// Return the user's model if they are logged in
// Throw a redirect to the login page if they aren't
export async function ensureUser(request: Request): Promise<User> {
  const userId = await getUserId(request);
  if (userId === null) {
    throw redirect('/auth/login');
  }

  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (user === null) {
    throw redirect('/auth/login');
  }

  return user;
}
