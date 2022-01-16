import { PrismaClient } from '@prisma/client';
import { useLoaderData, json, LoaderFunction } from 'remix';
import { z } from 'zod';
import { ensureAuthenticated } from '~/middleware';

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

type IndexData = {
  userId: number;
  tracks: any;
};

export const loader: LoaderFunction = async ({ request }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  // Get the access token from the database
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  });
  if (!user) throw new Response('User does not exist', { status: 404 });

  // Get the user's most recent favorite tracks from Spotify
  const res = await fetch(`https://api.spotify.com/v1/me/tracks?limit=5`, {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      Accept: 'application/json',
    },
  });
  const tracks = TracksResponse.parse(await res.json());

  const data: IndexData = {
    userId: await ensureAuthenticated(request),
    tracks: tracks.items.map((item) => ({
      spotifyId: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map((artist) => artist.name).join(' & '),
      thumbnailUrl: item.track.album.images[0].url,
      dateAdded: item.added_at,
    })),
  };

  return json(data);
};

export default function Index() {
  const data = useLoaderData<IndexData>();

  return <pre>{JSON.stringify(data.tracks, null, 2)}</pre>;
}
