import { PrismaClient } from '@prisma/client';
import { ActionFunction, json } from 'remix';
import {
  extractIntFromFormData,
  extractStringFromFormData,
} from '~/lib/helpers';
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
  const labelName = extractStringFromFormData(formData, 'labelName');
  const trackId = extractIntFromFormData(formData, 'trackId');

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
  const { id } = await prisma.label.create({
    data: {
      name: labelName,
      user: { connect: { id: userId } },
      tracks: {
        connect: [{ id: trackId }],
      },
    },
  });

  return json({ success: true, id });
};
