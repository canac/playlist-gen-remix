import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';
import { json, Link, LoaderFunction, useLoaderData } from 'remix';
import { commitSession, getSession } from '~/lib/sessions.server';
import { z } from 'zod';
import {
  extractStringFromEnvVar,
  extractStringFromSearchParams,
} from '~/lib/helpers.server';
import { prisma } from '~/lib/prisma.server';

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

type LoaderData = {
  redirectUri: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const searchParams = new URL(request.url).searchParams;
  const code = extractStringFromSearchParams(searchParams, 'code');
  const state = extractStringFromSearchParams(searchParams, 'state');
  const redirectUri = await unsign(
    state,
    extractStringFromEnvVar('COOKIE_SECRET'),
  );
  if (redirectUri === false) {
    throw new Response('Invalid OAuth state', { status: 500 });
  }

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

  const headers = new Headers();
  headers.append('Set-Cookie', await commitSession(session));
  headers.append('Set-Cookie', 'state=; Max-Age=0; Path=/auth');
  return json<LoaderData>({ redirectUri }, { headers });
};

export default function OauthCallback() {
  const { redirectUri } = useLoaderData<LoaderData>();

  useEffect(() => {
    document.location = redirectUri;
  });

  return (
    <Box sx={{ margin: '1em' }}>
      <Typography>Logging you in...</Typography>
      <Typography>
        Click <Link to={redirectUri}>here</Link> to return to the site if you
        are not redirected automatically.
      </Typography>
    </Box>
  );
}
