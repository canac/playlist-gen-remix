// Expose higher-level methods for interacting with the Spotify API

import { PrismaClient, User } from '@prisma/client';
import { differenceBy, map } from 'lodash';
import { z } from 'zod';

// https://api.spotify.com/v1/me/tracks
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
) {
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
