import { Label } from '@prisma/client';
import { List, ListItem, ListItemText } from '@mui/material';

export type LabelListProps = {
  labels: (Label & {
    numTracks: number;
  })[];
};

export default function LabelList(props: LabelListProps): JSX.Element {
  return (
    <List>
      {props.labels.map((label) => (
        <ListItem key={label.id}>
          <ListItemText primary={`${label.name} (${label.numTracks})`} />
        </ListItem>
      ))}
    </List>
  );
}
