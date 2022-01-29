import { ActionFunction, redirect } from 'remix';
import { extractIntFromParam } from '~/lib/helpers';
import { ensureAuthenticated } from '~/lib/middleware';
import { prisma } from '~/prisma.server';

/*
 * Delete a label.
 *
 * URL parameters:
 *   labelId: number  The id of the label to delete
 */
export const action: ActionFunction = async ({ request, params }) => {
  const userId = await ensureAuthenticated(request);

  const labelId = extractIntFromParam(params, 'labelId');

  // Delete the label
  const { count } = await prisma.label.deleteMany({
    where: { id: labelId, userId },
  });
  if (count === 0) {
    // The delete failed because no labels were found
    // Either the id was invalid or the label isn't owned by the user. Even if the
    // label exists, do not leak that information to the user if they don't own the label.
    throw new Response('Error deleting non-existent label', {
      status: 404,
    });
  }

  return redirect(`/labels`);
};
