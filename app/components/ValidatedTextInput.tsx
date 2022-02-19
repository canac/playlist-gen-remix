import { TextInput, TextInputProps } from '@mantine/core';
import { FieldErrors, useField } from 'remix-validated-form';

// Make the "name" prop from TextInputProps required
export type ValidatedTextInputProps = TextInputProps &
  Required<Pick<TextInputProps, 'name'>> & {
    fieldErrors?: FieldErrors;
  };

export default function ValidatedTextInput({
  fieldErrors,
  ...props
}: ValidatedTextInputProps): JSX.Element {
  const { getInputProps, error } = useField(props.name);
  const fieldError = fieldErrors?.[props.name];

  return (
    <TextInput
      id={props.name}
      error={error || fieldError}
      {...getInputProps(props)}
    />
  );
}
