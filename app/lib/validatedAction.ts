import { DataFunctionArgs } from '@remix-run/server-runtime';
import { withZod } from '@remix-validated-form/with-zod';
import { useActionData, useFetcher } from 'remix';
import { ValidationResult } from 'remix-validated-form';
import { ZodSchema, z } from 'zod';

// When a ValidationError is thrown in an validated form action, the action
// returns a ValidationResult representing the validation error
export class ValidationError extends Error {
  field: string;

  message: string;

  constructor(field: string, message: string) {
    super();
    this.field = field;
    this.message = message;
  }
}

// validatedFormAction methods are an abstraction over the base Remix action that
// provides greater type safety and validates inputs against a provided schema
export async function validatedFormAction<
  FormSchema,
  FormTypeDef,
  ParamsSchema,
  ResponseSchema,
>(args: {
  actionArgs: DataFunctionArgs;
  formSchema: ZodSchema<FormSchema, FormTypeDef, unknown>;
  paramsSchema: ZodSchema<ParamsSchema>;
  responseSchema: ZodSchema<ResponseSchema>;
  action: (
    actionArgs: DataFunctionArgs & {
      data: FormSchema & ParamsSchema;
    },
  ) => Promise<ResponseSchema | Response>;
}): Promise<ValidationResult<ResponseSchema> | Response> {
  const params = args.paramsSchema.parse(args.actionArgs.params);

  // Parse the form data using the provided schema
  const formData = await args.actionArgs.request.formData();
  const formResult = await withZod(args.formSchema).validate(formData);
  if (formResult.error) {
    return formResult;
  }

  // Send the parsed data to the action function
  try {
    const actionResponse = await args.action({
      ...args.actionArgs,
      data: { ...formResult.data, ...params },
    });
    return actionResponse instanceof Response
      ? actionResponse
      : {
          submittedData: formResult.submittedData,
          data: actionResponse,
          error: undefined,
        };
  } catch (err) {
    if (err instanceof ValidationError) {
      // Convert the ValidationError exception into a ValidationResult
      return {
        submittedData: formResult.submittedData,
        data: undefined,
        error: { fieldErrors: { [err.field]: err.message } },
      };
    }

    throw err;
  }
}

// Given a schema representing action response data, return a schema representing
// a ValidationResult schema that wraps that data
export function formActionResponseSchema<Data, Form, FormTypeDef, FormInput>(
  data: ZodSchema<Data>,
  formSchema: ZodSchema<Form, FormTypeDef, FormInput>,
) {
  return z.union([
    z.object({ data }),
    z.object({
      error: z.object({
        fieldErrors: z.record(z.string()),
      }),
      submittedData: formSchema,
    }),
  ]);
}

// Extends useActionData by validating the response against a provided schema
export function useValidatedActionData<Schema, SchemaTypeDef>(
  schema: ZodSchema<Schema, SchemaTypeDef, unknown>,
): Schema | undefined {
  const data = useActionData<unknown>();
  return typeof data === 'undefined' ? undefined : schema.parse(data);
}

// Extends useFetcher by validating the response against a provided schema
export function useValidatedFetcher<Schema>(schema: ZodSchema<Schema>) {
  const fetcher = useFetcher<unknown>();
  return {
    ...fetcher,
    ...{
      data:
        typeof fetcher.data === 'undefined'
          ? undefined
          : schema.parse(fetcher.data),
    },
  };
}
