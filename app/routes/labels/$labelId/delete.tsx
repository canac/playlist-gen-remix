import { Box, Button, Title } from '@mantine/core';
import { Label } from '@prisma/client';
import { withZod } from '@remix-validated-form/with-zod';
import { useState } from 'react';
import {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
  json,
  redirect,
  useLoaderData,
} from 'remix';
import { useHydrated } from 'remix-utils';
import { ValidatedForm } from 'remix-validated-form';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import ValidatedCheckbox from '~/components/ValidatedCheckbox';
import { extractIntFromParam } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import {
  formActionResponseSchema,
  validatedFormAction,
} from '~/lib/validatedAction';

type LabelData = {
  label: Pick<Label, 'name'>;
};

const paramsSchema = zfd.formData({
  labelId: zfd.numeric(z.number().min(0)),
});

const formSchema = withZod(
  z.object({
    confirm: zfd.checkbox(),
  }),
);

const responseSchema = z.null();

export const outputSchema = formActionResponseSchema(responseSchema);

// Delete a label
export const action: ActionFunction = async (actionArgs) =>
  validatedFormAction({
    actionArgs,
    paramsSchema,
    formSchema,
    responseSchema,
    async action({ request, data: { confirm, labelId } }) {
      const userId = await ensureAuthenticated(request);

      if (!confirm) {
        // The user didn't check the confirm checkbox, so do nothing
        return null;
      }

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
    },
  });

export const meta: MetaFunction = ({ data }: { data: LabelData }) => ({
  title: `Playlist Gen | Delete Label "${data.label.name}"`,
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
    select: { name: true },
  });
  if (!label) {
    throw new Response('Label could not be found', { status: 404 });
  }

  return json<LabelData>({
    label,
  });
};

export default function DeleteLabelRoute() {
  const { label } = useLoaderData<LabelData>();

  const isHydrated = useHydrated();

  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  return (
    <Box
      component={ValidatedForm}
      validator={formSchema}
      method="post"
      sx={{
        width: '25em',
        display: 'flex',
        flexDirection: 'column',
        gap: '1em',
      }}
    >
      <Title order={2}>Delete label</Title>
      <ValidatedCheckbox
        name="confirm"
        label={
          `Are you sure you want to delete the label "${label.name}"? ` +
          `This action cannot be undone.`
        }
        checked={confirmDelete}
        onChange={(event) => setConfirmDelete(event.target.checked)}
      />
      <Button
        type="submit"
        color="error"
        disabled={isHydrated && !confirmDelete}
      >
        Delete
      </Button>
    </Box>
  );
}
