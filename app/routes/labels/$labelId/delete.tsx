import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { Label } from '@prisma/client';
import { useState } from 'react';
import {
  ActionFunction,
  Form,
  LoaderFunction,
  MetaFunction,
  json,
  redirect,
  useLoaderData,
} from 'remix';
import { extractIntFromParam } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';

type LabelData = {
  label: Pick<Label, 'name'>;
};

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

  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  return (
    <Box
      component={Form}
      method="post"
      sx={{
        width: '25em',
        display: 'flex',
        flexDirection: 'column',
        gap: '1em',
      }}
    >
      <Typography variant="h3" component="h2">
        Delete label
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={confirmDelete}
            onChange={(event) => setConfirmDelete(event.target.checked)}
          />
        }
        label="Are you sure you want to delete the label? This action cannot be undone."
      />
      <Button type="submit" color="error" disabled={!confirmDelete}>
        Delete
      </Button>
    </Box>
  );
}
