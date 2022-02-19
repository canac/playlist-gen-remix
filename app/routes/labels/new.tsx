import { Box, Button, Title } from '@mantine/core';
import { withZod } from '@remix-validated-form/with-zod';
import { useState } from 'react';
import { ActionFunction, LoaderFunction, MetaFunction, redirect } from 'remix';
import { useHydrated } from 'remix-utils';
import { ValidatedForm } from 'remix-validated-form';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import SmartCriteriaInput from '~/components/SmartCriteriaInput';
import ValidatedCheckbox from '~/components/ValidatedCheckbox';
import ValidatedTextInput from '~/components/ValidatedTextInput';
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
  z
    .object({
      name: z.string().nonempty('Label name is required'),
      smartLabel: zfd.checkbox(),
      smartCriteria: z.string().optional(),
    })
    // Smart criteria cannot be empty when smart label checkbox is checked
    .refine((data) => !(data.smartLabel && data.smartCriteria?.length === 0), {
      message: 'Smart criteria must not be empty',
      path: ['smartCriteria'],
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
    async action({ request, data: { name, smartLabel, smartCriteria } }) {
      const userId = await ensureAuthenticated(request);

      if (
        smartLabel &&
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
          smartCriteria: smartLabel ? smartCriteria : null,
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
  const defaultValues =
    actionData && 'error' in actionData
      ? (actionData.submittedData as Record<string, unknown> & {
          smartLabel: boolean;
        })
      : undefined;

  const isHydrated = useHydrated();

  const [smartLabel, setSmartLabel] = useState<boolean>(
    defaultValues?.smartLabel ?? true,
  );

  return (
    <Box
      component={ValidatedForm}
      validator={formSchema}
      method="post"
      defaultValues={defaultValues}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        margin: '1em',
        width: '25em',
        gap: '1em',
      }}
    >
      <Title order={2}>Create label</Title>
      <ValidatedTextInput
        required
        name="name"
        label="Label name"
        fieldErrors={fieldErrors}
      />
      <ValidatedCheckbox
        name="smartLabel"
        label="Smart label"
        checked={smartLabel}
        onChange={(event) => setSmartLabel(event.target.checked)}
      />
      {(!isHydrated || smartLabel) && (
        <SmartCriteriaInput
          required={isHydrated}
          name="smartCriteria"
          label="Smart criteria"
          fieldErrors={fieldErrors}
        />
      )}
      <Button type="submit">Create</Button>
    </Box>
  );
}
