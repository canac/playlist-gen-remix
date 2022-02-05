import { Box, Button, Typography } from '@mui/material';
import { Label } from '@prisma/client';
import { withZod } from '@remix-validated-form/with-zod';
import {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
  json,
  useActionData,
  useLoaderData,
} from 'remix';
import {
  GenericObject,
  ValidatedForm,
  ValidatorError,
} from 'remix-validated-form';
import { z } from 'zod';
import SmartCriteriaInput from '~/components/SmartCriteriaInput';
import ValidatedTextField from '~/components/ValidatedTextField';
import { extractIntFromParam } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import { validateSmartCriteria } from '~/lib/smartLabel.server';

type LabelData = {
  label: Label;
};

const validator = withZod(
  z.object({
    name: z.string().nonempty('Label name is required'),
    smartCriteria: z
      .string()
      .nonempty('Smart criteria must not be empty')
      .optional(),
  }),
);

type ActionData =
  | { success: true }
  | { success: false; error: ValidatorError; submittedData: GenericObject };

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
export const action: ActionFunction = async ({
  request,
  params,
}): Promise<ActionData> => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId from the URL
  const labelId = extractIntFromParam(params, 'labelId');

  // Extract the other fields from the form
  const form = await request.formData();
  const result = await validator.validate(form);
  const { submittedData } = result;
  if (result.error) {
    return { success: false, error: result.error, submittedData };
  }
  const { name, smartCriteria } = result.data;

  if (
    typeof smartCriteria === 'string' &&
    !(await validateSmartCriteria(userId, smartCriteria))
  ) {
    return {
      success: false,
      error: { fieldErrors: { smartCriteria: 'Invalid smart criteria' } },
      submittedData,
    };
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

  return { success: true };
};

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
  const actionData = useActionData<ActionData>();
  const fieldErrors =
    actionData?.success === false ? actionData.error.fieldErrors : undefined;

  return (
    <Box
      component={ValidatedForm}
      validator={validator}
      method="post"
      key={label.id}
      defaultValues={
        actionData?.success === false ? actionData.submittedData : label
      }
      sx={{
        width: '25em',
        display: 'flex',
        flexDirection: 'column',
        gap: '1em',
      }}
    >
      <Typography variant="h3" component="h2">
        Edit label
      </Typography>
      <ValidatedTextField
        required
        name="name"
        label="Label name"
        variant="outlined"
        fieldErrors={fieldErrors}
      />
      {label.smartCriteria === null ? null : (
        <>
          <SmartCriteriaInput
            required
            name="smartCriteria"
            label="Smart criteria"
            variant="outlined"
            fieldErrors={fieldErrors}
          />
        </>
      )}
      <Button type="submit">Save</Button>
    </Box>
  );
}
