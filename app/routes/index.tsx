import { PrismaClient, Label, Track } from '@prisma/client';
import { useLoaderData, json, MetaFunction, LoaderFunction } from 'remix';
import TrackList from '~/components/TrackList';
import { ensureAuthenticated } from '~/middleware';
import { syncFavoriteTracks } from '~/spotifyApi';

type IndexData = {
  tracks: (Track & {
    labels: Label[];
  })[];
  labels: Label[];
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
      include: { labels: true },
      take: 10,
    }),
    labels: await prisma.label.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    }),
  });
};

export const meta: MetaFunction = () => {
  return {
    title: 'Playlist Gen',
    description: 'Generate Spotify playlists from labeled tracks',
  };
};

export default function Index() {
  const data = useLoaderData<IndexData>();

  return <TrackList tracks={data.tracks} labels={data.labels}></TrackList>;
}
