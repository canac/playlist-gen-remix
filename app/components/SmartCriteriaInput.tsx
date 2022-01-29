import { TextField, TextFieldProps, Typography } from '@mui/material';
import { debounce } from 'lodash';
import { useFetcher } from 'remix';
import { useEffect } from 'react';

export default function SmartCriteriaInput(props: TextFieldProps): JSX.Element {
  const fetcher = useFetcher();

  function loadCriteriaMatches(smartCriteria: string) {
    const form = new URLSearchParams();
    form.set('smartCriteria', smartCriteria);
    fetcher.submit(form, {
      action: '/smartLabelMatches',
      method: 'post',
    });
  }

  // Load the initial smart criteria matches
  useEffect(() => {
    if (typeof props.defaultValue === 'string') {
      loadCriteriaMatches(props.defaultValue);
    }
  }, []);

  return (
    <>
      <TextField
        {...props}
        onChange={debounce(
          (event) => loadCriteriaMatches(event.target.value),
          200,
        )}
      />
      {fetcher.data && !fetcher.data.success && (
        <Typography color="error">Invalid smart criteria</Typography>
      )}
      {fetcher.data && fetcher.data.success && (
        <Typography>
          Smart criteria matches <strong>{fetcher.data.matchCount}</strong>{' '}
          labels
        </Typography>
      )}
    </>
  );
}
