import { createCookieSessionStorage } from 'remix';
import invariant from 'tiny-invariant';

invariant(
  typeof process.env.COOKIE_SECRET === 'string',
  'COOKIE_SECRET environment variable is required',
);

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: '__session',
      path: '/',
      secrets: [process.env.COOKIE_SECRET],
      sameSite: true,
    },
  });

export { getSession, commitSession, destroySession };
