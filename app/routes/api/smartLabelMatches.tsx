import { withZod } from '@remix-validated-form/with-zod';
import { ActionFunction } from 'remix';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { getCriteriaMatches } from '~/lib/smartLabel.server';
import {
  ValidationError,
  formActionResponseSchema,
  validatedFormAction,
} from '~/lib/validatedAction';

const paramsSchema = zfd.formData({});

const formSchema = withZod(
  z.object({
    smartCriteria: z.string().nonempty('Smart criteria must not be empty'),
  }),
);

const responseSchema = z.object({
  matchCount: z.number(),
  matchExamples: z.array(z.string()),
});

export const outputSchema = formActionResponseSchema(responseSchema);

/*
 * Get information about the tracks that match a smart label.
 *
 * Parameters:
 *   smartCriteria: string  The smart label criteria
 */
export const action: ActionFunction = async (actionArgs) =>
  validatedFormAction({
    actionArgs,
    paramsSchema,
    formSchema,
    responseSchema,
    async action({ request, data: { smartCriteria } }) {
      const userId = await ensureAuthenticated(request);

      return getCriteriaMatches(userId, smartCriteria)
        .then((matches) => ({
          matchCount: matches.length,
          matchExamples: matches.slice(0, 5).map((track) => track.name),
        }))
        .catch(() => {
          throw new ValidationError('smartCriteria', 'Invalid smart criteria');
        });
    },
  });
