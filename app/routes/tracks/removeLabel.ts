import { PrismaClient } from '@prisma/client';
import { ActionFunction, redirect } from 'remix';
import invariant from 'tiny-invariant';
import { ensureAuthenticated } from '~/middleware';

/*
 * Remove a label from a track.
 *
 * Parameters:
 *   labelId: number  The id of the label to remove from the track
 *   trackId: number  The id of the track to remove the label from
 */
export const action: ActionFunction = async ({ request }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId and trackId from the form
  const formData = await request.formData();
  const labelIdRaw = formData.get('labelId');
  invariant(typeof labelIdRaw === 'string', '"labelId" must be a string');
  const labelId = parseInt(labelIdRaw, 10);
  invariant(!Number.isNaN(labelId), '"labelId" must contain a number');

  const trackIdRaw = formData.get('trackId');
  invariant(typeof trackIdRaw === 'string', '"trackId" must be a string');
  const trackId = parseInt(trackIdRaw, 10);
  invariant(!Number.isNaN(trackId), '"trackId" must contain a number');

  const prisma = new PrismaClient();
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { userId: true },
  });
  if (!track || track.userId !== userId) {
    // Even if the track exists, do not leak that information to the user if they do not own the track
    throw new Response('Error updating non-existent track', {
      status: 404,
    });
  }

  // Remove the link from the label to the track
  await prisma.track.update({
    where: { id: trackId },
    data: {
      labels: {
        disconnect: [{ id: labelId }],
      },
    },
  });

  return redirect('/');
};
