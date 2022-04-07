import { Prisma } from '@prisma/client';
import { Grammar, Parser } from 'nearley';
import grammar from '~/lib/labelGrammar.server';

// Initialize the parser for the smart label criteria
const parser = new Parser(Grammar.fromCompiled(grammar));

// Generate a prisma `where` clause from a criteria string or null if the criteria is invalid
export function generatePrismaFilter(
  criteria: string,
): Prisma.TrackWhereInput | null {
  try {
    const state = parser.save();
    parser.feed(criteria);
    const filter = parser.results[0] as Prisma.TrackWhereInput;
    // Save and restore the parser state so that we can reuse the parser instance
    parser.restore(state);
    return filter;
  } catch (err) {
    return null;
  }
}

// Return a boolean indicating whether the smart criteria is valid
export function validateSmartCriteria(criteria: string): boolean {
  return generatePrismaFilter(criteria) !== null;
}
