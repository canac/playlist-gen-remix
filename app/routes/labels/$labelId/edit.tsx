import { Box, Button, TextField, Typography } from '@mui/material';
import { Label } from '@prisma/client';
import {
  ActionFunction,
  Form,
  json,
  LoaderFunction,
  MetaFunction,
  useLoaderData,
} from 'remix';
import {
  extractIntFromParam,
  extractStringFromFormData,
} from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { validateSmartCriteria } from '~/lib/smartLabel.server';
import { attemptOr } from '~/lib/util';
import { prisma } from '~/lib/prisma.server';
import SmartCriteriaInput from '~/components/SmartCriteriaInput';

type LabelData = {
  label: Label;
};

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
export const action: ActionFunction = async ({ request, params }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId from the URL
  const labelId = extractIntFromParam(params, 'labelId');

  // Extract the other fields from the form
  const formData = await request.formData();
  const name = extractStringFromFormData(formData, 'name');
  const smartCriteria = attemptOr(
    () => extractStringFromFormData(formData, 'smartCriteria'),
    null,
  );

  if (
    smartCriteria !== null &&
    !(await validateSmartCriteria(userId, smartCriteria))
  ) {
    return new Response('Invalid smart criteria', { status: 500 });
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

  return json({ success: true });
};

export const meta: MetaFunction = ({ data }: { data: LabelData }) => {
  return {
    title: `Playlist Gen | Edit Label "${data.label.name}"`,
  };
};

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

  return (
    <Box
      component={Form}
      action={`/labels/${label.id}/edit`}
      method="post"
      key={label.id}
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
      <TextField
        required
        name="name"
        label="Label name"
        variant="outlined"
        defaultValue={label.name}
      />
      {label.smartCriteria === null ? null : (
        <SmartCriteriaInput
          required
          name="smartCriteria"
          label="Smart criteria"
          variant="outlined"
          defaultValue={label.smartCriteria}
        />
      )}
      <Button type="submit">Save</Button>
    </Box>
  );
}
