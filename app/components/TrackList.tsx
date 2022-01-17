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
import { useFetcher } from 'remix';

export type TrackListProps = {
  tracks: (Track & {
    labels: Label[];
  })[];
  labels: Label[];
};

export default function TrackList(props: TrackListProps): JSX.Element {
  const fetcher = useFetcher();

  return (
    <List>
      {props.tracks.map((track) => {
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
              isOptionEqualToValue={(option, value) => option.id === value.id}
              defaultValue={track.labels}
              onChange={(event, value, reason, details) => {
                if (!details) return;

                if (reason === 'selectOption') {
                  fetcher.submit(
                    {
                      trackId: track.id.toString(),
                      labelId: details.option.id.toString(),
                    },
                    {
                      method: 'post',
                      action: '/tracks/addLabel',
                    },
                  );
                } else if (reason === 'removeOption') {
                  fetcher.submit(
                    {
                      trackId: track.id.toString(),
                      labelId: details.option.id.toString(),
                    },
                    {
                      method: 'post',
                      action: '/tracks/removeLabel',
                    },
                  );
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
