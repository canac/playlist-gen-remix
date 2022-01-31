import { createCookieSessionStorage } from 'remix';
import { extractStringFromEnvVar } from '~/lib/helpers.server';

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: '__session',
      path: '/',
      secrets: [extractStringFromEnvVar('COOKIE_SECRET')],
      sameSite: true,
    },
  });

export { getSession, commitSession, destroySession };
