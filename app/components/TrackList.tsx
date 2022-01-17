import { Label, Track } from '@prisma/client';
import {
  Autocomplete,
  Avatar,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  TextField,
} from '@mui/material';
import { map } from 'lodash';

export type TrackListProps = {
  tracks: (Track & {
    labels: Label[];
  })[];
  labels: Label[];
};

export default function TrackList(props: TrackListProps): JSX.Element {
  return (
    <List>
      {props.tracks.map((track) => {
        const labelIds = new Set(map(track.labels, 'id'));
        return (
          <ListItem key={track.id}>
            <ListItemAvatar>
              <Avatar
                variant="square"
                alt={`${track.name} album artwork`}
                src={track.thumbnailUrl}
              />
            </ListItemAvatar>
            <ListItemText primary={track.name} secondary={track.artist} />
            <Autocomplete
              multiple
              options={props.labels}
              disableCloseOnSelect
              getOptionLabel={(label) => label.name}
              defaultValue={props.labels.filter((label) =>
                labelIds.has(label.id),
              )}
              onChange={(event, value, reason, details) => {
                if (!details) return;

                if (reason === 'removeOption') {
                  console.log('removed', details.option);
                } else if (reason === 'selectOption') {
                  console.log('added', details.option);
                }
              }}
              renderOption={(props, label, { selected }) => (
                <li {...props}>
                  <Checkbox style={{ marginRight: 8 }} checked={selected} />
                  {label.name}
                </li>
              )}
              style={{ width: 400 }}
              renderInput={(params) => <TextField {...params} label="Labels" />}
            />
          </ListItem>
        );
      })}
    </List>
  );
}
