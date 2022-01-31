import { ActionFunction, redirect } from 'remix';
import { ensureUser } from '~/lib/middleware.server';
import { syncPlaylists } from '~/lib/spotifyApi.server';

/*
 * Push the user's labeled tracks from the database into Spotify playlists.
 */
export const action: ActionFunction = async ({ request }) => {
  const user = await ensureUser(request);
  await syncPlaylists(user);
  return redirect('/');
};
