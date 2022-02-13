import { createCookieSessionStorage } from 'remix';
import { env } from '~/lib/env.server';

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    path: '/',
    secrets: [env.COOKIE_SECRET],
    sameSite: true,
  },
});
export { sessionStorage };
