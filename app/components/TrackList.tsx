import { Label, Track } from '@prisma/client';
import { List } from '@mui/material';
import TrackItem from './TrackItem';

export type TrackListProps = {
  tracks: (Track & {
    labels: Label[];
  })[];
  labels: Label[];
};

export default function TrackList(props: TrackListProps): JSX.Element {
  return (
    <List>
      {props.tracks.map((track) => (
        <TrackItem
          key={track.id}
          track={track}
          labels={props.labels}
        ></TrackItem>
      ))}
    </List>
  );
}
