import { redirect, ActionFunction } from 'remix';
import { getSession, destroySession } from '~/sessions.server';

// Log the user out and redirect them to the login page
export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  return redirect('/auth/login', {
    headers: { 'Set-Cookie': await destroySession(session) },
  });
};
