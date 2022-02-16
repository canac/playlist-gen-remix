import { Typography } from '@mui/material';
import { debounce } from 'lodash';
import { useEffect } from 'react';
import ValidatedTextField, {
  ValidatedTextFieldProps,
} from '~/components/ValidatedTextField';
import { useValidatedFetcher } from '~/lib/validatedAction';
import { outputSchema } from '~/routes/api/smartLabelMatches';

export default function SmartCriteriaInput(
  props: ValidatedTextFieldProps,
): JSX.Element {
  const fetcher = useValidatedFetcher(outputSchema);

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
      {fetcher.data && 'error' in fetcher.data && (
        <Typography color="error">Invalid smart criteria</Typography>
      )}
      {fetcher.data && 'data' in fetcher.data && (
        <Typography>
          Smart criteria matches <strong>{fetcher.data.data.matchCount}</strong>{' '}
          labels including <em>{fetcher.data.data.matchExamples.join(', ')}</em>
        </Typography>
      )}
    </>
  );
}
