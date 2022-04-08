// Attempts to invoke func, returning either the result or the default value if
// it throws an exception.
// Based on the proposed lodash utility function of the same name: https://github.com/lodash/lodash/pull/4123
export function attemptOr<Result, Default>(
  func: (...args: unknown[]) => Result,
  defaultValue: Default,
): Result | Default {
  try {
    return func();
  } catch (e) {
    return defaultValue;
  }
}

// Build a URL from a base URL and a collection of query string params, but
// omit params that match the default value
export function buildUrl(
  base: string,
  qsParams: Array<{
    name: string;
    defaultValue: string | number | boolean;
    value: string | number | boolean | null;
  }>,
): string {
  const params: Array<[string, string]> = qsParams.flatMap(
    ({ name, value, defaultValue }) =>
      value === null || value === defaultValue
        ? []
        : [[name, value.toString()]],
  );
  if (params.length === 0) {
    return base;
  }
  return `${base}?${new URLSearchParams(params).toString()}`;
}
