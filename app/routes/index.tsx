import { useLoaderData, json, MetaFunction, LoaderFunction } from 'remix';
import { ensureAuthenticated } from '~/middleware';

type IndexData = {
  userId: number;
};

export const loader: LoaderFunction = async ({ request }) => {
  const data: IndexData = {
    userId: await ensureAuthenticated(request),
  };

  return json(data);
};

export let meta: MetaFunction = () => {
  return {
    title: 'Playlist Gen',
    description: 'Generate Spotify playlists from labeled tracks',
  };
};

export default function Index() {
  const data = useLoaderData<IndexData>();

  return <pre>{data.userId}</pre>;
}
