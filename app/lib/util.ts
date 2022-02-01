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
