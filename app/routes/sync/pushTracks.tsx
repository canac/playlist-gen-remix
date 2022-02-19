import { Box, Button, Text, Title } from '@mantine/core';
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
      <Title order={2} sx={{ marginBottom: '0.5em' }}>
        Push tracks into Spotify playlists
      </Title>
      {data?.success && (
        <Text color="green" weight="bold">
          Success!
        </Text>
      )}
      <Button type="submit">Push</Button>
    </Box>
  );
}
