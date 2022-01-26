import { Params } from 'react-router-dom';
import invariant from 'tiny-invariant';

// Extract the param with the specified name from the provided route params, expecting it to be a string
export function extractStringFromParam(
  params: Params<string>,
  paramName: string,
): string {
  const value = params[paramName];
  invariant(typeof value === 'string', `"${paramName}" must be a string`);
  return value;
}

// Extract the param with the specified name from the provided route params, expecting it to be an integer
export function extractIntFromParam(
  params: Params<string>,
  paramName: string,
): number {
  const valueRaw = extractStringFromParam(params, paramName);
  const value = parseInt(valueRaw, 10);
  invariant(!Number.isNaN(value), `"${paramName}" must contain a number`);
  return value;
}
