import { Params } from 'react-router-dom';
import invariant from 'tiny-invariant';

// Extract a string value from an unknown input
function validateString(input: unknown, name: string): string {
  invariant(typeof input === 'string', `"${name}" must be a string`);
  return input;
}

// Extract an integer from an unknown input
function validateInt(input: unknown, name: string): number {
  const value = parseInt(validateString(validateString(input, name), name), 10);
  invariant(!Number.isNaN(value), `"${name}" must contain a number`);
  return value;
}

// Extract the param with the specified name from the provided route params, expecting it to be a string
export function extractStringFromParam(
  params: Params<string>,
  paramName: string,
): string {
  return validateString(params[paramName], paramName);
}

// Extract the param with the specified name from the provided route params, expecting it to be an integer
export function extractIntFromParam(
  params: Params<string>,
  paramName: string,
): number {
  return validateInt(params[paramName], paramName);
}

// Extract the param with the specified name from the provided form data, expecting it to be a string
export function extractStringFromFormData(
  form: FormData,
  paramName: string,
): string {
  return validateString(form.get(paramName), paramName);
}

// Extract the param with the specified name from the provided form data, expecting it to be an integer
export function extractIntFromFormData(
  form: FormData,
  paramName: string,
): number {
  return validateInt(form.get(paramName), paramName);
}

// Extract the param with the specified name from the provided form data, expecting it to be a string
export function extractStringFromSearchParams(
  searchParams: URLSearchParams,
  paramName: string,
): string {
  return validateString(searchParams.get(paramName), paramName);
}

// Extract the param with the specified name from the provided form data, expecting it to be an integer
export function extractIntFromSearchParams(
  searchParams: URLSearchParams,
  paramName: string,
): number {
  return validateInt(searchParams.get(paramName), paramName);
}

// Extract the param with the specified name from the environment variables, expecting it to be a string
export function extractStringFromEnvVar(varName: string): string {
  return validateString(process.env[varName], varName);
}
