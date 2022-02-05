import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { withZod } from '@remix-validated-form/with-zod';
import { useState } from 'react';
import {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
  redirect,
  useActionData,
} from 'remix';
import {
  GenericObject,
  ValidatedForm,
  ValidatorError,
} from 'remix-validated-form';
import { z } from 'zod';
import SmartCriteriaInput from '~/components/SmartCriteriaInput';
import ValidatedTextField from '~/components/ValidatedTextField';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import { validateSmartCriteria } from '~/lib/smartLabel.server';

export const meta: MetaFunction = () => ({
  title: 'Playlist Gen | Create label',
});

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
 * Create a new label.
 *
 * Parameters:
 *   name: string           The new name of the label
 *   smartCriteria: string? The new smart criteria for the label
 */
export const action: ActionFunction = async ({
  request,
}): Promise<ActionData | Response> => {
  const userId = await ensureAuthenticated(request);

  // Extract the fields from the form
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

  // Create the label
  const label = await prisma.label.create({
    data: {
      userId,
      name,
      smartCriteria,
    },
    select: { id: true },
  });

  // Redirect to the newly-created label
  return redirect(`/labels/${label.id}`);
};

export const loader: LoaderFunction = async ({ request }) => {
  // Get the authenticated state from the session
  await ensureAuthenticated(request);
  return null;
};

export default function NewLabelRoute() {
  const actionData = useActionData<ActionData>();
  const fieldErrors =
    actionData?.success === false ? actionData.error.fieldErrors : undefined;

  const [smartLabel, setSmartLabel] = useState<boolean>(false);

  return (
    <Box
      component={ValidatedForm}
      validator={validator}
      method="post"
      defaultValues={
        actionData?.success === false ? actionData.submittedData : undefined
      }
      sx={{
        display: 'flex',
        flexDirection: 'column',
        margin: '1em',
        width: '25em',
        gap: '1em',
      }}
    >
      <Typography variant="h3" component="h2">
        Create label
      </Typography>
      <ValidatedTextField
        required
        name="name"
        label="Label name"
        variant="outlined"
        fieldErrors={fieldErrors}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={smartLabel}
            onChange={(event) => setSmartLabel(event.target.checked)}
          />
        }
        label="Smart label"
      />
      {smartLabel && (
        <SmartCriteriaInput
          required
          name="smartCriteria"
          label="Smart criteria"
          variant="outlined"
          fieldErrors={fieldErrors}
        />
      )}
      <Button type="submit">Create</Button>
    </Box>
  );
}
