import { Label } from '@prisma/client';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { Form } from 'remix';
import { useState } from 'react';
import SmartCriteriaInput from './SmartCriteriaInput';

export type LabelEditorProps = {
  label: Label & {
    numTracks: number;
  };
};

export default function LabelEditor(props: LabelEditorProps): JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const label = props.label;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        margin: '1em',
        width: '25em',
        gap: '3em',
      }}
    >
      <Box
        component={Form}
        action={`/labels/${label.id}/edit`}
        method="post"
        key={label.id}
        sx={{
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
      <Box
        component={Form}
        action={`/labels/${label.id}/delete`}
        method="post"
        sx={{
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
    </Box>
  );
}
