import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { withZod } from '@remix-validated-form/with-zod';
import { useState } from 'react';
import { ActionFunction, LoaderFunction, MetaFunction, redirect } from 'remix';
import { ValidatedForm } from 'remix-validated-form';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import SmartCriteriaInput from '~/components/SmartCriteriaInput';
import ValidatedTextField from '~/components/ValidatedTextField';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import { validateSmartCriteria } from '~/lib/smartLabel.server';
import {
  ValidationError,
  formActionResponseSchema,
  useValidatedActionData,
  validatedFormAction,
} from '~/lib/validatedAction';

export const meta: MetaFunction = () => ({
  title: 'Playlist Gen | Create label',
});

const paramsSchema = zfd.formData({});

const formSchema = withZod(
  z.object({
    name: z.string().nonempty('Label name is required'),
    smartCriteria: z
      .string()
      .nonempty('Smart criteria must not be empty')
      .optional(),
  }),
);

const responseSchema = z.null();

export const outputSchema = formActionResponseSchema(responseSchema);

// Create a new label
export const action: ActionFunction = async (actionArgs) =>
  validatedFormAction({
    actionArgs,
    paramsSchema,
    formSchema,
    responseSchema,
    async action({ request, data: { name, smartCriteria } }) {
      const userId = await ensureAuthenticated(request);

      if (
        typeof smartCriteria === 'string' &&
        !(await validateSmartCriteria(userId, smartCriteria))
      ) {
        throw new ValidationError('smartCriteria', 'Invalid smart criteria');
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
    },
  });

export const loader: LoaderFunction = async ({ request }) => {
  // Get the authenticated state from the session
  await ensureAuthenticated(request);
  return null;
};

export default function NewLabelRoute() {
  const actionData = useValidatedActionData(outputSchema);
  const fieldErrors =
    actionData && 'error' in actionData
      ? actionData.error.fieldErrors
      : undefined;

  const [smartLabel, setSmartLabel] = useState<boolean>(false);

  return (
    <Box
      component={ValidatedForm}
      validator={formSchema}
      method="post"
      defaultValues={
        actionData && 'error' in actionData
          ? actionData.submittedData
          : undefined
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
