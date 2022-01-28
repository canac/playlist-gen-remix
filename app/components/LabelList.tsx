import { Label } from '@prisma/client';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { useMatch } from 'react-router';
import { Link, useResolvedPath } from 'remix';

export type LabelListProps = {
  labels: (Label & {
    numTracks: number;
  })[];
};

export default function LabelList(props: LabelListProps): JSX.Element {
  return (
    <List>
      {props.labels.map((label) => {
        const to = `/labels/${label.id}`;
        const resolved = useResolvedPath(to);
        const match = useMatch({ path: resolved.pathname, end: true });

        return (
          <ListItem key={label.id}>
            <ListItemButton selected={Boolean(match)} component={Link} to={to}>
              <ListItemText primary={`${label.name} (${label.numTracks})`} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}
