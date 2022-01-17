import { Label, Track } from '@prisma/client';
import {
  Autocomplete,
  Avatar,
  Checkbox,
  ListItem,
  ListItemText,
  ListItemAvatar,
  TextField,
} from '@mui/material';
import { useFetcher } from 'remix';
import { useState } from 'react';

export type TrackItemProps = {
  track: Track & {
    labels: Label[];
  };
  labels: Label[];
};

export default function TrackItem(props: TrackItemProps): JSX.Element {
  const [value, setValue] = useState(props.track.labels);

  const fetcher = useFetcher();
  const track = props.track;

  return (
    <ListItem>
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
        value={value}
        options={props.labels}
        disableCloseOnSelect
        getOptionLabel={(label) => label.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
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

          setValue(value);
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
}
