import { Box, Button, Typography } from '@mui/material';
import { green } from '@mui/material/colors';
import { ActionFunction, Form, json, useActionData } from 'remix';
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

// Form to support no-JS
export default function PullTracksRoute() {
  const data = useActionData<{ success: boolean }>();

  return (
    <Box
      component={Form}
      sx={{
        margin: '1em',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      method="post"
      action="/sync/pullTracks"
    >
      <Typography variant="h6" component="h2">
        Pull liked tracks from Spotify
      </Typography>
      {data?.success && (
        <Typography sx={{ color: green[500] }}>Success!</Typography>
      )}
      <Button type="submit">Pull</Button>
    </Box>
  );
}
