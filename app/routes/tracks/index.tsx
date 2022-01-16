import { PrismaClient, Track } from '@prisma/client';
import { useLoaderData, json, LoaderFunction } from 'remix';
import { ensureAuthenticated } from '~/middleware';
import { syncFavoriteTracks } from '~/spotifyApi';

type IndexData = {
  tracks: Track[];
};

export const loader: LoaderFunction = async ({ request }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  // Get the access token from the database
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accessToken: true },
  });
  if (!user) throw new Response('User does not exist', { status: 404 });

  await syncFavoriteTracks(user);

  return json({
    tracks: await prisma.track.findMany({
      where: { userId },
      orderBy: { dateAdded: 'desc' },
    }),
  });
};

export default function Index() {
  const data = useLoaderData<IndexData>();

  return <pre>{JSON.stringify(data.tracks, null, 2)}</pre>;
}
