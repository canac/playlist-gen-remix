import { Box, Button } from '@mantine/core';
import { sign } from '@remix-run/node/crypto';
import {
  LoaderFunction,
  MetaFunction,
  json,
  redirect,
  useLoaderData,
} from 'remix';
import { env } from '~/lib/env.server';
import { getUser } from '~/lib/middleware.server';

type LoginData = {
  spotifyOauthUrl: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const redirectUri = new URL(request.url).searchParams.get('redirect') ?? '/';

  if ((await getUser(request)) !== null) {
    // Redirect to the home page if the user is already logged in
    return redirect(redirectUri);
  }

  const state = await sign(redirectUri, env.COOKIE_SECRET);
  const qs = new URLSearchParams({
    response_type: 'code',
    client_id: env.SPOTIFY_CLIENT_ID,
    scope: 'user-library-read,playlist-read-private,playlist-modify-private',
    redirect_uri: `${env.DOMAIN}/auth/oauth_callback`,
    state,
  });
  return json<LoginData>(
    {
      spotifyOauthUrl: `https://accounts.spotify.com/authorize?${qs.toString()}`,
    },
    {
      headers: {
        'Set-Cookie': `state=${state}; Max-Age=${
          15 * 60 * 1000
        }; Path=/auth; HttpOnly; SameSite=Strict; Secure`,
      },
    },
  );
};

export const meta: MetaFunction = () => ({
  title: 'Playlist Gen | Login',
});

export default function Login() {
  const data = useLoaderData<LoginData>();

  return (
    <Box sx={{ textAlign: 'center', paddingTop: '1em' }}>
      <Button component="a" href={data.spotifyOauthUrl}>
        Login with Spotify
      </Button>
    </Box>
  );
}
