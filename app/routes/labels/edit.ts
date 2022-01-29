import { ActionFunction, redirect } from 'remix';
import {
  extractIntFromFormData,
  extractStringFromFormData,
} from '~/lib/helpers';
import { ensureAuthenticated } from '~/lib/middleware';
import { attemptOr } from '~/lib/util';
import { prisma } from '~/prisma.server';

/*
 * Edit a label.
 *
 * Parameters:
 *   labelId: number        The id of the label to edit
 *   name: string           The new name of the label
 *   smartCriteria: string? The new smart criteria for the label
 */
export const action: ActionFunction = async ({ request }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId and trackId from the form
  const formData = await request.formData();
  const labelId = extractIntFromFormData(formData, 'labelId');
  const name = extractStringFromFormData(formData, 'name');
  const smartCriteria = attemptOr(
    () => extractStringFromFormData(formData, 'smartCriteria'),
    null,
  );

  // Update the label
  const { count } = await prisma.label.updateMany({
    where: { id: labelId, userId },
    data: {
      name,
      ...(smartCriteria && { smartCriteria }),
    },
  });
  if (count === 0) {
    // The update failed because no labels were found
    // Either the id was invalid or the label isn't owned by the user. Even if the
    // label exists, do not leak that information to the user if they don't own the label.
    throw new Response('Error updating non-existent label', {
      status: 404,
    });
  }

  return redirect(`/labels/${labelId}`);
};
