// Expose higher-level methods for interacting with the Spotify API

import { PrismaClient, User } from '@prisma/client';
import { chunk, differenceBy, map } from 'lodash';
import { z } from 'zod';

// GET https://api.spotify.com/v1/me/tracks
// Only includes fields that we care about
const TracksResponse = z.object({
  items: z.array(
    z.object({
      added_at: z.string(),
      track: z.object({
        album: z.object({
          images: z.array(
            z.object({
              url: z.string(),
            }),
          ),
        }),
        artists: z.array(
          z.object({
            name: z.string(),
          }),
        ),
        id: z.string(),
        name: z.string(),
      }),
    }),
  ),
});

// Pull the user's favorite tracks from Spotify into the database
export async function syncFavoriteTracks(
  user: Pick<User, 'id' | 'accessToken'>,
): Promise<void> {
  // At first, only load five tracks because the user is unlikely to have new favorites since the last time and we don't
  // want to transfer lots of new tracks unnecessarily
  let offset = 0;
  let limit = 5;

  while (true) {
    // Get the user's most recent favorite tracks from Spotify
    const res = await fetch(
      `https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    const tracks = TracksResponse.parse(await res.json());
    const newTracks = tracks.items.map((item) => ({
      spotifyId: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map((artist) => artist.name).join(' & '),
      thumbnailUrl: item.track.album.images[0].url,
      dateAdded: item.added_at,
    }));

    // See if any of those tracks are already in the database
    const prisma = new PrismaClient();
    const existingTracks = await prisma.track.findMany({
      select: { spotifyId: true },
      where: {
        userId: user.id,
        spotifyId: { in: map(newTracks, 'spotifyId') },
      },
    });

    // Add the missing tracks to the database
    const missingTracks = differenceBy(newTracks, existingTracks, 'spotifyId');
    await prisma.track.createMany({
      data: missingTracks.map((track) => ({ ...track, userId: user.id })),
    });

    if (missingTracks.length === limit) {
      // All of the tracks were missing, so load another, larger batch
      offset += limit;
      limit = 25;
    } else {
      // Some of the tracks weren't missing, so everything after this batch
      // will already exist in the database
      break;
    }
  }
}

// POST https://api.spotify.com/v1/me/playlists
// Only includes fields that we care about
const CreatePlaylistResponse = z.object({
  id: z.string(),
});

// Push the tracks from the database into Spotify playlists
export async function syncPlaylists(user: User): Promise<void> {
  const prisma = new PrismaClient();

  // Find all labels that don't have a playlist yet
  const newLabels = await prisma.label.findMany({
    where: { userId: user.id, playlist: null },
  });
  for (const label of newLabels) {
    // Create a new Spotify playlist for the label
    const res = await fetch(
      `https://api.spotify.com/v1/users/${user.spotifyId}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `${label.name} [generated]`,
          description: `Tracks labeled "${label.name}" by playlist-gen`,
          public: false,
        }),
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );
    const { id: spotifyId } = CreatePlaylistResponse.parse(await res.json());

    // Save the playlist to the database
    await prisma.playlist.create({
      data: { userId: user.id, spotifyId, labelId: label.id },
    });
  }

  const dbPlaylists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: { label: { include: { tracks: true } } },
  });
  for (const playlist of dbPlaylists) {
    const dummyTrackSpotifyId = '41MCdlvXOl62B7Kv86Bb1v';

    // Replace the tracks in the Spotify playlist with the new tracks
    // If the playlist needs to be cleared without any new tracks put into it, it is more
    // efficient to replace the entire playlist with a single song and then remove it than
    // to query the playlist for all of it's ids, possibly in multiple batches, and then
    // remove all of those ids, possibly in multiple batches
    const trackSpotifyIds = map(playlist.label.tracks, 'spotifyId');
    console.log(trackSpotifyIds);
    for (const [index, spotifyIds] of chunk(
      trackSpotifyIds.length > 0 ? trackSpotifyIds : [dummyTrackSpotifyId],
      // Send 50 tracks at a time
      50,
    ).entries()) {
      const uris = spotifyIds.map((spotifyId) => `spotify:track:${spotifyId}`);
      console.log(uris);
      const res = await fetch(
        `https://api.spotify.com/v1/playlists/${
          playlist.spotifyId
        }/tracks?uris=${encodeURIComponent(uris.join(','))}`,
        {
          // During the first chunk, send PUT request to replace all previous tracks with the new chunk of tracks
          // For subsequent chunks, send POST request to append the new chunk of tracks to the existing tracks
          // to avoid overwriting the chunks that were just uploaded
          method: index === 0 ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            Accept: 'application/json',
          },
        },
      );
      await res.json();
    }

    // If the playlist needs to be emptied, remove the dummy track that we added to it
    if (playlist.label.tracks.length === 0) {
      const res = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.spotifyId}/tracks`,
        {
          method: 'DELETE',
          body: JSON.stringify({
            tracks: [{ uri: `spotify:track:${dummyTrackSpotifyId}` }],
          }),
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      await res.json();
    }
  }
}
