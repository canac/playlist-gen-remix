import { PrismaClient, Label } from '@prisma/client';
import { useLoaderData, json, LoaderFunction, MetaFunction } from 'remix';
import { extractIntFromParam } from '~/lib/helpers';
import { ensureAuthenticated } from '~/middleware';

type LabelData = {
  label: Label & {
    numTracks: number;
  };
};

export const loader: LoaderFunction = async ({ request, params }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  // Get the label from the database
  const prisma = new PrismaClient();
  const label = await prisma.label.findFirst({
    where: {
      id: extractIntFromParam(params, 'labelId'),
      userId,
    },
    include: {
      _count: {
        select: { tracks: true },
      },
    },
  });
  if (!label) {
    throw new Response('Label could not be found', { status: 404 });
  }

  const data: LabelData = {
    label: { ...label, numTracks: label._count.tracks },
  };
  return json(data);
};

export const meta: MetaFunction = ({ data }: { data: LabelData }) => {
  return {
    title: `Playlist Gen | Label "${data.label.name}"`,
    description: 'Generate Spotify playlists from labeled tracks',
  };
};

export default function LabelRoute() {
  const data = useLoaderData<LabelData>();

  return (
    <p>
      {data.label.name} ({data.label.numTracks})
    </p>
  );
}
