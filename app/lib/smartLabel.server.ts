import { Prisma } from '@prisma/client';
import parser from '~/lib/labelGrammar.server';

// Generate a prisma `where` clause from a criteria string or null if the criteria is invalid
export function generatePrismaFilter(
  criteria: string,
): Prisma.TrackWhereInput | null {
  const result = parser.parse(criteria);
  return result.success ? (result.result as Prisma.TrackWhereInput) : null;
}

// Return a boolean indicating whether the smart criteria is valid
export function validateSmartCriteria(criteria: string): boolean {
  return parser.parse(criteria).success;
}
