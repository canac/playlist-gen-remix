import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import {
  LoaderFunction,
  MetaFunction,
  Form,
  ActionFunction,
  redirect,
} from 'remix';
import { extractStringFromFormData } from '~/lib/helpers';
import { ensureAuthenticated } from '~/lib/middleware';
import attemptOr from '~/lib/util';
import { prisma } from '~/prisma.server';

export const meta: MetaFunction = () => {
  return {
    title: 'Playlist Gen | Create label',
  };
};

/*
 * Create a new label.
 *
 * Parameters:
 *   name: string           The new name of the label
 *   smartCriteria: string? The new smart criteria for the label
 */
export const action: ActionFunction = async ({ request }) => {
  const userId = await ensureAuthenticated(request);

  // Extract the labelId and trackId from the form
  const formData = await request.formData();
  const name = extractStringFromFormData(formData, 'name');
  const smartCriteria = attemptOr(
    () => extractStringFromFormData(formData, 'smartCriteria'),
    null,
  );

  // Create the label
  const label = await prisma.label.create({
    data: {
      userId,
      name,
      smartCriteria,
    },
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
  const [smartLabel, setSmartLabel] = useState<boolean>(false);

  return (
    <Box
      component={Form}
      method="post"
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
      <TextField required name="name" label="Label name" variant="outlined" />
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
        <TextField
          required
          name="smartCriteria"
          label="Smart criteria"
          variant="outlined"
        />
      )}
      <Button type="submit">Create</Button>
    </Box>
  );
}
