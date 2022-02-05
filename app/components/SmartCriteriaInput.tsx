import { Typography } from '@mui/material';
import { debounce } from 'lodash';
import { useEffect } from 'react';
import { useFetcher } from 'remix';
import ValidatedTextField, {
  ValidatedTextFieldProps,
} from '~/components/ValidatedTextField';

export default function SmartCriteriaInput(
  props: ValidatedTextFieldProps,
): JSX.Element {
  const fetcher = useFetcher<
    { success: true; matchCount: number } | { success: false; error: Error }
  >();

  function loadCriteriaMatches(smartCriteria: string) {
    const form = new URLSearchParams();
    form.set('smartCriteria', smartCriteria);
    fetcher.submit(form, {
      action: '/api/smartLabelMatches',
      method: 'post',
    });
  }

  // Load the initial smart criteria matches on component load
  useEffect(() => {
    if (typeof props.defaultValue === 'string') {
      loadCriteriaMatches(props.defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ValidatedTextField
        {...props}
        onChange={debounce(
          (event: React.ChangeEvent<HTMLInputElement>) =>
            loadCriteriaMatches(event.target.value),
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
