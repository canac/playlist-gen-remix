import { Checkbox, CheckboxProps } from '@mantine/core';
import { FieldErrors, useField } from 'remix-validated-form';

// Make the "name" prop from Checkbox required
export type ValidatedCheckboxProps = CheckboxProps &
  Required<Pick<CheckboxProps, 'name'>> & {
    fieldErrors?: FieldErrors;
  };

export default function ValidatedCheckbox(
  props: ValidatedCheckboxProps,
): JSX.Element {
  const { getInputProps } = useField(props.name);
  return <Checkbox id={props.name} {...getInputProps(props)} />;
}
