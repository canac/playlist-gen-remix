import { Label, Track } from '@prisma/client';
import {
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Stack,
} from '@mui/material';

export type TrackListProps = {
  tracks: (Track & {
    labels: Label[];
  })[];
};

export default function TrackList(props: TrackListProps) {
  return (
    <List>
      {props.tracks.map((track) => (
        <ListItem key={track.id}>
          <ListItemAvatar>
            <Avatar
              variant="square"
              alt={`${track.name} album artwork`}
              src={track.thumbnailUrl}
            />
          </ListItemAvatar>
          <ListItemText primary={track.name} secondary={track.artist} />
          <Stack direction="row" spacing={1}>
            {track.labels.map((label) => (
              <Chip
                key={label.id}
                label={label.name}
                variant="outlined"
                onDelete={() => {}}
              />
            ))}
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
