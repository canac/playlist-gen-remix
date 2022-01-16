import type { LoaderFunction } from 'remix';
import { useLoaderData, json, redirect } from 'remix';
import { getUserId } from '~/middleware';

type LoginData = {
  spotifyOauthUrl: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  if ((await getUserId(request)) !== null) {
    // Redirect to the home page if the user is already logged in
    return redirect('/');
  }

  const data: LoginData = {
    spotifyOauthUrl: `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&scope=user-read-private&redirect_uri=${process.env.DOMAIN}/auth/oauth_callback`,
  };

  return json(data);
};

export default function Login() {
  const data = useLoaderData<LoginData>();

  return (
    <div style={{ textAlign: 'center' }}>
      <a href={data.spotifyOauthUrl}>Login with Spotify</a>
    </div>
  );
}
