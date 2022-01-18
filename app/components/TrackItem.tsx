import { Label, Track } from '@prisma/client';
import {
  Autocomplete,
  Avatar,
  Checkbox,
  ListItem,
  ListItemText,
  ListItemAvatar,
  TextField,
  createFilterOptions,
} from '@mui/material';
import { useSubmit, useFetcher } from 'remix';
import { useEffect, useState } from 'react';

export type TrackItemProps = {
  track: Track & {
    labels: Label[];
  };
  labels: Label[];
};

const filter = createFilterOptions<Label>();

// This special id represents the id of the "Add label" fake label
// It must be a value that is impossible in the database
const createNewLabelId = 0;

export default function TrackItem(props: TrackItemProps): JSX.Element {
  const track = props.track;

  const [labelsState, setLabels] = useState(props.track.labels);

  // Automatically update the tracks' labels whenever they are changed by the server
  useEffect(() => {
    setLabels(props.track.labels);
  }, [props.track.labels]);

  const submit = useSubmit();
  const fetcher = useFetcher();

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
        value={labelsState}
        options={props.labels}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);

          // If the user has typed something that isn't the name of an existing
          // label, add a fake label option that will allow them to create that label
          const { inputValue } = params;
          const isExisting = options.some(
            (option) => inputValue === option.name,
          );
          if (inputValue !== '' && !isExisting) {
            filtered.push({
              id: createNewLabelId,
              userId: track.userId,
              name: inputValue,
            });
          }

          return filtered;
        }}
        disableCloseOnSelect
        getOptionLabel={(label) => label.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onChange={(event, value, reason, details) => {
          const label = details?.option;

          if (label && reason === 'selectOption') {
            if (label.id === createNewLabelId) {
              // Create the label on the server
              const form = new URLSearchParams();
              form.set('trackId', track.id.toString());
              form.set('labelName', label.name);
              fetcher.submit(form, {
                method: 'post',
                action: '/tracks/createLabel',
                replace: true,
              });

              // Don't call setLabels because then labelsState will include the new label
              // sentinel value, which causes issues because it doesn't have an id that
              // matches an existing label
              return;
            } else {
              // Add the label to the track on the server
              const form = new URLSearchParams();
              form.set('trackId', track.id.toString());
              form.set('labelId', label.id.toString());
              submit(form, {
                method: 'post',
                action: '/tracks/addLabel',
                replace: true,
              });
            }
          } else if (label && reason === 'removeOption') {
            // Remove the label from the track on the server
            const form = new URLSearchParams();
            form.set('trackId', track.id.toString());
            form.set('labelId', label.id.toString());
            submit(form, {
              method: 'post',
              action: '/tracks/removeLabel',
              replace: true,
            });
          } else if (reason === 'clear') {
            // Clear all labels from the track
            const form = new URLSearchParams();
            form.set('trackId', track.id.toString());
            submit(form, {
              method: 'post',
              action: '/tracks/clearLabels',
              replace: true,
            });
          }

          setLabels(value);
        }}
        renderOption={(props, label, { selected }) => (
          <li {...props}>
            <Checkbox style={{ marginRight: 8 }} checked={selected} />
            {label.id === createNewLabelId ? `Add "${label.name}"` : label.name}
          </li>
        )}
        style={{ width: 400 }}
        renderInput={(params) => <TextField {...params} label="Labels" />}
      />
    </ListItem>
  );
}
