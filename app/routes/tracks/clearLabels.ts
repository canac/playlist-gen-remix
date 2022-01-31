import { ActionFunction, json } from 'remix';
import { extractIntFromFormData } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';

/*
 * Remove all labels from a track.
 *
 * Parameters:
 *   trackId: number  The id of the track to remove the labels from
 */
export const action: ActionFunction = async ({ request }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId and trackId from the form
  const formData = await request.formData();
  const trackId = extractIntFromFormData(formData, 'trackId');

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      labels: { select: { id: true } },
    },
  });
  if (!track || track.userId !== userId) {
    // Even if the track exists, do not leak that information to the user if they do not own the track
    throw new Response('Error updating non-existent track', {
      status: 404,
    });
  }

  // Remove all links from the track to its labels
  await prisma.track.update({
    where: { id: trackId },
    data: {
      labels: {
        disconnect: track.labels,
      },
    },
  });

  return json({ success: true });
};
