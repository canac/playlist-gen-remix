import { ActionFunction, redirect } from 'remix';
import {
  extractIntFromParam,
  extractStringFromFormData,
} from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { validateSmartCriteria } from '~/lib/smartLabel.server';
import { attemptOr } from '~/lib/util';
import { prisma } from '~/lib/prisma.server';

/*
 * Edit a label.
 *
 * URL parameters:
 *   labelId: number        The id of the label to delete
 *
 * Form parameters:
 *   name: string           The new name of the label
 *   smartCriteria: string? The new smart criteria for the label
 */
export const action: ActionFunction = async ({ request, params }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId from the URL
  const labelId = extractIntFromParam(params, 'labelId');

  // Extract the other fields from the form
  const formData = await request.formData();
  const name = extractStringFromFormData(formData, 'name');
  const smartCriteria = attemptOr(
    () => extractStringFromFormData(formData, 'smartCriteria'),
    null,
  );

  if (
    smartCriteria !== null &&
    !(await validateSmartCriteria(userId, smartCriteria))
  ) {
    return new Response('Invalid smart criteria', { status: 500 });
  }

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
