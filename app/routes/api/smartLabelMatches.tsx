import { ActionFunction } from 'remix';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { generatePrismaFilter } from '~/lib/smartLabel.server';
import {
  ValidationError,
  formActionResponseSchema,
  validatedFormAction,
} from '~/lib/validatedAction';

const paramsSchema = zfd.formData({});

const formSchema = z.object({
  smartCriteria: z.string().nonempty('Smart criteria must not be empty'),
});

const responseSchema = z.object({
  matchCount: z.number(),
  matchExamples: z.array(z.string()),
});

export const outputSchema = formActionResponseSchema(
  responseSchema,
  formSchema,
);

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

      const where = generatePrismaFilter(smartCriteria);
      if (where === null) {
        throw new ValidationError('smartCriteria', 'Invalid smart criteria');
      }

      const matches = await prisma.track.findMany({
        where: { userId, ...where },
        select: { name: true },
      });
      return {
        matchCount: matches.length,
        matchExamples: matches.slice(0, 5).map((track) => track.name),
      };
    },
  });
