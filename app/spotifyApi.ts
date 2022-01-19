// Expose higher-level methods for interacting with the Spotify API

import { Label, PrismaClient, User } from '@prisma/client';
import { chunk, differenceBy, map } from 'lodash';
import { z } from 'zod';
import { Parser, Grammar } from 'nearley';
import grammar from './labelGrammar';

// Initialize the parser for the smart label criteria
const parser = new Parser(Grammar.fromCompiled(grammar));

// Make a request to the Spotify API
// This function takes care of adding the Spotify access token to the request
// and retrying failures due to an expired access token
// Return the response body JSON
async function spotifyFetch(user: User, req: Request): Promise<unknown> {
  let { accessToken } = user;

  if (new Date() > user.accessTokenExpiresAt) {
    // The access token is expired, so preemptively refresh it
    console.log('Expired access token, retrying...');
    accessToken = (await refreshAccessToken(user)).accessToken;
  }

  // Add the authorization headers to the provided request
  const authorizedReq = new Request(req.url, req);
  authorizedReq.headers.set('Authorization', `Bearer ${accessToken}`);
  authorizedReq.headers.set('Accept', 'application/json');

  console.log(`${req.method} ${req.url}`);
  const res = await fetch(authorizedReq);
  console.log(`Status: ${res.status}`);

  const body = await res.json();
  if (!res.ok) {
    console.error('Spotify API error:');
    console.error(body);
    throw res;
  }

  return body;
}

// POST https://accounts.spotify.com/api/token
// Only includes fields that we care about
const TokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

// Get the user a new Spotify access token
// Return the User with the new access token
async function refreshAccessToken(user: User): Promise<User> {
  // Exchange the refresh token for an access token
  const body = new URLSearchParams();
  body.append('grant_type', 'refresh_token');
  body.append('refresh_token', user.refreshToken);
  const authorization = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(authorization).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const { access_token: accessToken, expires_in: expiresIn } =
    TokenResponse.parse(await tokenRes.json());

  // Save the new access token
  const prisma = new PrismaClient();
  const modifiedFields = {
    accessToken,
    // expiresIn is the length of the token's validity in seconds
    // Calculate the absolute time when it will expire, considering it expired a minute
    // sooner to avoid accidentally using an expired access token
    accessTokenExpiresAt: new Date(Date.now() + (expiresIn - 60) * 1000),
  };
  await prisma.user.update({
    where: { id: user.id },
    data: modifiedFields,
  });
  return { ...user, ...modifiedFields };
}

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
        explicit: z.boolean(),
        name: z.string(),
      }),
    }),
  ),
});

// Pull the user's favorite tracks from Spotify into the database
export async function syncFavoriteTracks(user: User): Promise<void> {
  // At first, only load five tracks because the user is unlikely to have new favorites since the last time and we don't
  // want to transfer lots of new tracks unnecessarily
  let offset = 0;
  let limit = 5;

  while (true) {
    // Get the user's most recent favorite tracks from Spotify
    const tracks = TracksResponse.parse(
      await spotifyFetch(
        user,
        new Request(
          `https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=${limit}`,
        ),
      ),
    );
    const newTracks = tracks.items.map((item) => ({
      spotifyId: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map((artist) => artist.name).join(' & '),
      thumbnailUrl: item.track.album.images[0].url,
      dateAdded: item.added_at,
      explicit: item.track.explicit,
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
    const newPlaylist = {
      name: `${label.name} [generated]`,
      description: `Tracks labeled "${label.name}" by playlist-gen`,
      public: false,
    };
    const { id: spotifyId } = CreatePlaylistResponse.parse(
      await spotifyFetch(
        user,
        new Request(
          `https://api.spotify.com/v1/users/${user.spotifyId}/playlists`,
          {
            method: 'POST',
            body: JSON.stringify(newPlaylist),
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      ),
    );

    // Save the playlist to the database
    await prisma.playlist.create({
      data: { userId: user.id, spotifyId, labelId: label.id },
    });
  }

  const allTracks = await prisma.track.findMany({
    where: { userId: user.id },
    select: { id: true, dateAdded: true, spotifyId: true, explicit: true },
  });
  const allLabels = await prisma.label.findMany({
    // Filter out smart labels
    where: { userId: user.id, smartCriteria: null },
    include: {
      tracks: { select: { id: true } },
    },
  });
  // Index the labels and their tracks by id
  // The key is the label id, and the value is a set of the label's track ids
  const indexedLabels = new Map<number, Set<number>>(
    allLabels.map((label) => [label.id, new Set(map(label.tracks, 'id'))]),
  );

  const dbPlaylists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: {
      label: {
        include: {
          tracks: { select: { spotifyId: true } },
        },
      },
    },
  });
  for (const playlist of dbPlaylists) {
    const dummyTrackSpotifyId = '41MCdlvXOl62B7Kv86Bb1v';

    let tracks = playlist.label.tracks;

    // Override the tracks for smart labels
    const { smartCriteria } = playlist.label;
    if (smartCriteria) {
      try {
        // Parsing the smart criteria produces an evaluator function that when provided
        // a way to look up the values for value identifiers determines whether a track
        // matches the criteria
        const state = parser.save();
        parser.feed(smartCriteria);
        const evaluator = parser.results[0];
        // Save and restore the parser state so that we can reuse the parser instance
        parser.restore(state);
        tracks = allTracks.filter((track) =>
          // Pass the evaluator a method that looks up the values of each value identifier passed in
          evaluator((value: string): boolean => {
            if (value === 'explicit') {
              return track.explicit;
            }
            if (value === 'clean') {
              return !track.explicit;
            }

            const yearMatches = /^year:(?<year>\d+)$/.exec(value);
            if (yearMatches?.groups) {
              const year = parseInt(yearMatches.groups.year, 10);
              return track.dateAdded.getFullYear() === year;
            }

            const labelMatches = /^label:(?<labelId>\d+)$/.exec(value);
            if (labelMatches?.groups) {
              const labelId = parseInt(labelMatches.groups.labelId, 10);
              const labelTracks = indexedLabels.get(labelId);
              if (!labelTracks) {
                throw new Error(`Referenced non-existent label "${labelId}"`);
              }

              return labelTracks.has(track.id);
            }

            throw new Error(`Invalid value "${value}"`);
          }),
        );
      } catch (err) {
        console.error(err);
      }
    }

    // Replace the tracks in the Spotify playlist with the new tracks
    // If the playlist needs to be cleared without any new tracks put into it, it is more
    // efficient to replace the entire playlist with a single song and then remove it than
    // to query the playlist for all of it's ids, possibly in multiple batches, and then
    // remove all of those ids, possibly in multiple batches
    const trackSpotifyIds = map(tracks, 'spotifyId');
    console.log(trackSpotifyIds);
    for (const [index, spotifyIds] of chunk(
      trackSpotifyIds.length > 0 ? trackSpotifyIds : [dummyTrackSpotifyId],
      // Send 50 tracks at a time
      50,
    ).entries()) {
      const uris = spotifyIds.map((spotifyId) => `spotify:track:${spotifyId}`);
      console.log(uris);
      await spotifyFetch(
        user,
        new Request(
          `https://api.spotify.com/v1/playlists/${
            playlist.spotifyId
          }/tracks?uris=${encodeURIComponent(uris.join(','))}`,
          {
            // During the first chunk, send PUT request to replace all previous tracks with the new chunk of tracks
            // For subsequent chunks, send POST request to append the new chunk of tracks to the existing tracks
            // to avoid overwriting the chunks that were just uploaded
            method: index === 0 ? 'PUT' : 'POST',
          },
        ),
      );
    }

    // If the playlist needs to be emptied, remove the dummy track that we added to it
    if (playlist.label.tracks.length === 0) {
      const res = await spotifyFetch(
        user,
        new Request(
          `https://api.spotify.com/v1/playlists/${playlist.spotifyId}/tracks`,
          {
            method: 'DELETE',
            body: JSON.stringify({
              tracks: [{ uri: `spotify:track:${dummyTrackSpotifyId}` }],
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    }
  }
}
