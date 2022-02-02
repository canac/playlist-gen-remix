import { Label } from '@prisma/client';
import { useLoaderData, json, LoaderFunction, MetaFunction } from 'remix';
import { extractIntFromParam } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';

type LabelData = {
  label: Pick<Label, 'id' | 'name'>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  // Get the label from the database
  const label = await prisma.label.findFirst({
    where: {
      id: extractIntFromParam(params, 'labelId'),
      userId,
    },
    select: { id: true, name: true },
  });
  if (!label) {
    throw new Response('Label could not be found', { status: 404 });
  }

  return json<LabelData>({
    label,
  });
};

export const meta: MetaFunction = ({ data }: { data: LabelData }) => {
  return {
    title: `Playlist Gen | Label "${data.label.name}"`,
  };
};

export default function LabelRoute() {
  const data = useLoaderData<LabelData>();

  return null;
}
