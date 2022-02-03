import { Box, Button, Typography } from '@mui/material';
import { green } from '@mui/material/colors';
import { ActionFunction, Form, json, useActionData } from 'remix';
import { ensureUser } from '~/lib/middleware.server';
import { syncPlaylists } from '~/lib/spotifyApi.server';

/*
 * Push the user's labeled tracks from the database into Spotify playlists.
 */
export const action: ActionFunction = async ({ request }) => {
  const user = await ensureUser(request);
  await syncPlaylists(user);
  return json({ success: true });
};

// Form to support no-JS
export default function PushTracksRoute() {
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
      action="/sync/pushTracks"
    >
      <Typography variant="h6" component="h2">
        Push tracks into Spotify playlists
      </Typography>
      {data?.success && (
        <Typography sx={{ color: green[500] }}>Success!</Typography>
      )}
      <Button type="submit">Push</Button>
    </Box>
  );
}
