import { Track } from '@prisma/client';
import {
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';

export type TrackListProps = {
  tracks: Track[];
};

export default function TrackList(props: TrackListProps) {
  return (
    <List>
      {props.tracks.map((track) => (
        <ListItem>
          <ListItemAvatar>
            <Avatar
              variant="square"
              alt={`${track.name} album artwork`}
              src={track.thumbnailUrl}
            />
          </ListItemAvatar>
          <ListItemText primary={track.name} secondary={track.artist} />
        </ListItem>
      ))}
    </List>
  );
}
