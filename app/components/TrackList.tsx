import { List } from '@mui/material';
import { Album, Artist, Label, Track } from '@prisma/client';
import TrackItem from './TrackItem';

export type TrackListProps = {
  tracks: (Track & {
    album: Album;
    artists: Artist[];
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
