import { Label } from '@prisma/client';
import { Box, Button, TextField, Typography } from '@mui/material';
import { Form } from 'remix';

export type LabelEditorProps = {
  label: Label & {
    numTracks: number;
  };
};

export default function LabelEditor(props: LabelEditorProps): JSX.Element {
  const label = props.label;

  return (
    <Box
      component={Form}
      action="/labels/edit"
      method="post"
      key={label.id}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        margin: '1em',
        width: '25em',
        gap: '1em',
      }}
    >
      <Typography variant="h3" component="h2">
        Edit label
      </Typography>
      <input type="hidden" name="labelId" value={label.id} />
      <TextField
        required
        name="name"
        label="Label name"
        variant="outlined"
        defaultValue={label.name}
      />
      {label.smartCriteria === null ? null : (
        <TextField
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
