import { Label } from '@prisma/client';
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faPencil,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
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
  const match = useMatch({ path: resolved.pathname, end: false });

  return (
    <ListItem
      secondaryAction={
        labelId !== 'new' && (
          <>
            <Link to={`${to}/edit`}>
              <IconButton aria-label="edit">
                <FontAwesomeIcon icon={faPencil} />
              </IconButton>
            </Link>
            <Link to={`${to}/delete`}>
              <IconButton aria-label="delete" color="error">
                <FontAwesomeIcon icon={faTrash} />
              </IconButton>
            </Link>
          </>
        )
      }
      // Make the selection go all the way to the edge
      sx={{ paddingRight: 0 }}
    >
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
    <List component="nav">
      {props.labels.map((label) => (
        <LabelLink key={label.id} labelId={label.id}>
          <ListItemText
            primary={`${label.name} (${label.numTracks})`}
            secondary={
              label.smartCriteria === null ? null : (
                <>
                  <FontAwesomeIcon icon={faWandMagicSparkles} />{' '}
                  {label.smartCriteria}
                </>
              )
            }
          />
        </LabelLink>
      ))}
      <LabelLink labelId="new">
        <ListItemText primary={'Create new label...'} />
      </LabelLink>
    </List>
  );
}
