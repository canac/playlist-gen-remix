import { useEffect } from 'react';
import { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { commitSession, getSession } from '~/sessions.server';

export const loader: LoaderFunction = async ({ request }) => {
  invariant(
    typeof process.env.DOMAIN === 'string',
    'DOMAIN environment variable is required',
  );
  invariant(
    typeof process.env.SPOTIFY_CLIENT_ID === 'string',
    'SPOTIFY_CLIENT_ID environment variable is required',
  );
  invariant(
    typeof process.env.SPOTIFY_CLIENT_SECRET === 'string',
    'SPOTIFY_CLIENT_SECRET environment variable is required',
  );

  const code = new URL(request.url).searchParams.get('code');
  invariant(typeof code === 'string', 'Expected code to be a string');

  // Exchange the code for an access token
  const body = new URLSearchParams();
  body.append('grant_type', 'authorization_code');
  body.append('code', code);
  body.append('redirect_uri', `${process.env.DOMAIN}/auth/oauth_callback`);
  const authorization = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(authorization).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const { access_token: token } = await tokenRes.json();
  invariant(typeof token === 'string', 'Expected token to be a string');

  // Use the access token to get the user's id
  const userRes = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const { id } = await userRes.json();

  // Save the user id to the session
  const session = await getSession();
  session.set('userId', id);
  return new Response('', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
};

export default function Login() {
  useEffect(() => {
    document.location = '/';
  });

  return (
    <div className="page">
      <p>Logging you in...</p>
      <p>
        Click <a href="/">here</a> to return to the site if you are not
        redirected automatically.
      </p>
    </div>
  );
}
