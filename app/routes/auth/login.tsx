import { Box, Button } from '@mui/material';
import {
  useLoaderData,
  json,
  redirect,
  LoaderFunction,
  MetaFunction,
} from 'remix';
import { getUser } from '~/lib/middleware.server';

type LoginData = {
  spotifyOauthUrl: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  if ((await getUser(request)) !== null) {
    // Redirect to the home page if the user is already logged in
    return redirect('/');
  }

  return json<LoginData>({
    spotifyOauthUrl: `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&scope=user-library-read,playlist-read-private,playlist-modify-private&redirect_uri=${process.env.DOMAIN}/auth/oauth_callback`,
  });
};

export const meta: MetaFunction = () => {
  return {
    title: 'Playlist Gen | Login',
  };
};

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
