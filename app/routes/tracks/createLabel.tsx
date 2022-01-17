import { PrismaClient } from '@prisma/client';
import { ActionFunction, redirect } from 'remix';
import invariant from 'tiny-invariant';
import { ensureAuthenticated } from '~/middleware';

/*
 * Create a new label that is immediately added to an existing track.
 *
 * Parameters:
 *   labelName: string  The name of the new label
 *   trackId: number  The id of the track to add the new label to
 */
export const action: ActionFunction = async ({ request }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelName and trackId from the form
  const formData = await request.formData();
  const labelName = formData.get('labelName');
  invariant(typeof labelName === 'string', '"labelName" must be a string');

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

  // Create the label and link it to the track
  await prisma.label.create({
    data: {
      name: labelName,
      user: { connect: { id: userId } },
      tracks: {
        connect: [{ id: trackId }],
      },
    },
  });

  return redirect('/');
};
