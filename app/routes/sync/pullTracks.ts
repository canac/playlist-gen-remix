import { ActionFunction, redirect } from 'remix';
import { ensureUser } from '~/middleware';
import { syncFavoriteTracks } from '~/spotifyApi';

/*
 * Pull the user's liked tracks from Spotify into the database.
 */
export const action: ActionFunction = async ({ request }) => {
  const user = await ensureUser(request);
  await syncFavoriteTracks(user);
  return redirect('/');
};
