import { Label } from '@prisma/client';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { useMatch } from 'react-router';
import { Link, useResolvedPath } from 'remix';
import { ReactNode } from 'react';

function LabelLink({
  labelId,
  children,
}: {
  labelId: number | 'new';
  children?: ReactNode;
}): JSX.Element {
  const to = `/labels/${labelId}`;
  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end: true });

  return (
    <ListItem>
      <ListItemButton selected={Boolean(match)} component={Link} to={to}>
        {children}
      </ListItemButton>
    </ListItem>
  );
}

export type LabelListProps = {
  labels: (Label & {
    numTracks: number;
  })[];
};

export default function LabelList(props: LabelListProps): JSX.Element {
  return (
    <List>
      {props.labels.map((label) => (
        <LabelLink key={label.id} labelId={label.id}>
          <ListItemText primary={`${label.name} (${label.numTracks})`} />
        </LabelLink>
      ))}
      <LabelLink labelId="new">
        <ListItemText primary={'Create new label...'} />
      </LabelLink>
    </List>
  );
}
