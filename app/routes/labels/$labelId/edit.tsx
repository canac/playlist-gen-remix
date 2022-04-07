import { Box, Button, Title } from '@mantine/core';
import { Label } from '@prisma/client';
import { withZod } from '@remix-validated-form/with-zod';
import {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
  json,
  useLoaderData,
} from 'remix';
import { ValidatedForm } from 'remix-validated-form';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import SmartCriteriaInput from '~/components/SmartCriteriaInput';
import ValidatedTextField from '~/components/ValidatedTextInput';
import { extractIntFromParam } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import { validateSmartCriteria } from '~/lib/smartLabel.server';
import {
  ValidationError,
  formActionResponseSchema,
  useValidatedActionData,
  validatedFormAction,
} from '~/lib/validatedAction';

type LabelData = {
  label: Label;
};

const paramsSchema = zfd.formData({
  labelId: zfd.numeric(z.number().min(0)),
});

const formSchema = z.object({
  name: z.string().nonempty('Label name is required'),
  smartCriteria: z
    .string()
    .nonempty('Smart criteria must not be empty')
    .optional(),
});
const formValidator = withZod(formSchema);
const responseSchema = z.null();

export const outputSchema = formActionResponseSchema(
  responseSchema,
  formSchema,
);

// Edit a label
export const action: ActionFunction = async (actionArgs) =>
  validatedFormAction({
    actionArgs,
    formSchema,
    paramsSchema,
    responseSchema,
    async action({ request, data: { labelId, name, smartCriteria } }) {
      const userId = await ensureAuthenticated(request);

      if (
        typeof smartCriteria === 'string' &&
        !validateSmartCriteria(smartCriteria)
      ) {
        throw new ValidationError('smartCriteria', 'Invalid smart criteria');
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

      return null;
    },
  });

export const meta: MetaFunction = ({ data }: { data: LabelData }) => ({
  title: `Playlist Gen | Edit Label "${data.label.name}"`,
});

export const loader: LoaderFunction = async ({ request, params }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  // Get the label from the database
  const label = await prisma.label.findFirst({
    where: {
      id: extractIntFromParam(params, 'labelId'),
      userId,
    },
  });
  if (!label) {
    throw new Response('Label could not be found', { status: 404 });
  }

  return json<LabelData>({
    label,
  });
};

export default function EditLabelRoute() {
  const { label } = useLoaderData<LabelData>();
  const actionData = useValidatedActionData(outputSchema);
  const fieldErrors =
    actionData && 'error' in actionData
      ? actionData.error.fieldErrors
      : undefined;

  return (
    <Box
      component={ValidatedForm}
      validator={formValidator}
      method="post"
      key={label.id}
      defaultValues={
        actionData && 'error' in actionData ? actionData.submittedData : label
      }
      sx={{
        width: '25em',
        display: 'flex',
        flexDirection: 'column',
        gap: '1em',
      }}
    >
      <Title order={2}>Edit label</Title>
      <ValidatedTextField
        required
        name="name"
        label="Label name"
        fieldErrors={fieldErrors}
      />
      {label.smartCriteria === null ? null : (
        <>
          <SmartCriteriaInput
            required
            name="smartCriteria"
            label="Smart criteria"
            fieldErrors={fieldErrors}
          />
        </>
      )}
      <Button type="submit">Save</Button>
    </Box>
  );
}
