import { Label } from '@prisma/client';
import { ListItem, ListItemText } from '@mui/material';

export type LabelDetailProps = {
  label: Label & {
    numTracks: number;
  };
};

export default function LabelDetail(props: LabelDetailProps): JSX.Element {
  const label = props.label;

  return (
    <ListItem>
      <ListItemText primary={`${label.name} (${label.numTracks})`} />
    </ListItem>
  );
}
