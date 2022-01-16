import { redirect } from 'remix';
import { getSession } from '~/sessions.server';

// Extract the user id from the session, returning null if the user isn't logged in
export async function getUserId(request: Request): Promise<string | null> {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  return typeof userId === 'string' ? userId : null;
}

// Ensure the the user is authenticated
// Return the user's unique id if they are logged in
// Throw a redirect to the login page if they aren't
export async function ensureAuthenticated(request: Request): Promise<string> {
  const userId = await getUserId(request);
  if (userId === null) {
    throw redirect('/auth/login');
  }

  return userId;
}
