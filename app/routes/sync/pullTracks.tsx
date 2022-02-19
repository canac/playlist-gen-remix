import { Box, Button, Text, Title } from '@mantine/core';
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
      <Title order={2} sx={{ marginBottom: '0.5em' }}>
        Pull liked tracks from Spotify
      </Title>
      {data?.success && (
        <Text color="green" weight="bold">
          Success!
        </Text>
      )}
      <Button type="submit">Pull</Button>
    </Box>
  );
}
