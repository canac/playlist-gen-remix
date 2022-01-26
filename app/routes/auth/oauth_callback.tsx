import { useEffect } from 'react';
import { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { PrismaClient } from '@prisma/client';
import { commitSession, getSession } from '~/sessions.server';
import { z } from 'zod';
import { extractStringFromEnvVar } from '~/lib/helpers';

// POST https://accounts.spotify.com/api/token
// Only includes fields that we care about
const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

// GET https://api.spotify.com/v1/me
// Only includes fields that we care about
const ProfileResponse = z.object({
  id: z.string(),
  images: z.array(
    z.object({
      url: z.string(),
    }),
  ),
});

export const loader: LoaderFunction = async ({ request }) => {
  const code = new URL(request.url).searchParams.get('code');
  invariant(typeof code === 'string', 'Expected code to be a string');

  // Exchange the code for an access token
  const body = new URLSearchParams();
  body.append('grant_type', 'authorization_code');
  body.append('code', code);
  body.append(
    'redirect_uri',
    `${extractStringFromEnvVar('DOMAIN')}/auth/oauth_callback`,
  );
  const authorization = `${extractStringFromEnvVar(
    'SPOTIFY_CLIENT_ID',
  )}:${extractStringFromEnvVar('SPOTIFY_CLIENT_SECRET')}`;
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(authorization).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  } = TokenResponse.parse(await tokenRes.json());

  // Use the access token to get the user's id
  const userRes = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const profile = ProfileResponse.parse(await userRes.json());
  const spotifyId = profile.id;

  // Save the user, avatar URL, and access token to the database
  const prisma = new PrismaClient();
  const updatedFields = {
    avatarUrl: profile.images[0]?.url ?? null,
    accessToken,
    refreshToken,
    // expiresIn is the length of the token's validity in seconds
    // Calculate the absolute time when it will expire, considering it expired a minute
    // sooner to avoid accidentally using an expired access token
    accessTokenExpiresAt: new Date(Date.now() + (expiresIn - 60) * 1000),
  };
  const { id: userId } = await prisma.user.upsert({
    where: { spotifyId },
    create: { spotifyId, ...updatedFields },
    update: updatedFields,
    select: { id: true },
  });

  // Save the user id to the session
  const session = await getSession();
  session.set('userId', userId);

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
