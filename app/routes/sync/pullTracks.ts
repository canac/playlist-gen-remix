import { ActionFunction, json } from 'remix';
import { ensureUser } from '~/lib/middleware.server';
import { syncFavoriteTracks } from '~/lib/spotifyApi.server';

/*
 * Pull the user's liked tracks from Spotify into the database.
 */
export const action: ActionFunction = async ({ request }) => {
  const user = await ensureUser(request);
  await syncFavoriteTracks(user);
  return json({ success: true });
};
