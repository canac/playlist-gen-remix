import { ActionFunction, json } from 'remix';
import { extractStringFromFormData } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { getCriteriaMatches } from '~/lib/smartLabel.server';

/*
 * Get information about the tracks that match a smart label.
 *
 * Parameters:
 *   smartCriteria: string  The smart label criteria
 */
export const action: ActionFunction = async ({ request }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId and trackId from the form
  const formData = await request.formData();
  const smartCriteria = extractStringFromFormData(formData, 'smartCriteria');

  try {
    const matches = await getCriteriaMatches(userId, smartCriteria);
    return json({ success: true, matchCount: matches.length });
  } catch (error) {
    return json({ success: false, error }, { status: 500 });
  }
};
