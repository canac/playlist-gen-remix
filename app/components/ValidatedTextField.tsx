import { TextField, TextFieldProps } from '@mui/material';
import { FieldErrors, useField } from 'remix-validated-form';

// Make the "name" prop from TextFieldProps required
export type ValidatedTextFieldProps = TextFieldProps &
  Required<Pick<TextFieldProps, 'name'>> & {
    fieldErrors?: FieldErrors;
  };

export default function ValidatedTextField({
  fieldErrors,
  ...props
}: ValidatedTextFieldProps): JSX.Element {
  const { getInputProps, error } = useField(props.name);
  const fieldError = fieldErrors?.[props.name];

  return (
    <TextField
      error={Boolean(error) || Boolean(fieldError)}
      helperText={error || fieldError}
      {...getInputProps(props)}
    />
  );
}
