import { z } from 'zod';
import { numeric } from 'zod-form-data';

const envSchema = z.object({
  PORT: numeric(),
  DOMAIN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
});

// Validate the environment variables against the schema
export const env = envSchema.parse(process.env);
