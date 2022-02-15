import { Track } from '@prisma/client';
import { difference, map } from 'lodash';
import { Grammar, Parser } from 'nearley';
import { z } from 'zod';
import CacheToken from '~/lib/cacheToken';
import grammar from '~/lib/labelGrammar.server';
import { prisma } from '~/lib/prisma.server';

// Initialize the parser for the smart label criteria
const parser = new Parser(Grammar.fromCompiled(grammar));

type GetFunc = (value: unknown) => boolean;

const dateCompareKeyword = z.object({
  operation: z.function(z.tuple([z.number(), z.number()]), z.boolean()),
  extract: z.function(z.tuple([z.date()]), z.number()),
  rhs: z.number().min(1),
});
const keywordSchema = z.union([
  z.object({ name: z.literal('clean') }),
  z.object({ name: z.literal('explicit') }),
  z.object({ name: z.literal('unlabeled') }),
  z.intersection(z.object({ name: z.literal('added') }), dateCompareKeyword),
  z.intersection(z.object({ name: z.literal('released') }), dateCompareKeyword),
  z.object({
    name: z.literal('label'),
    labelId: z.number().min(1),
  }),
]);

type FilterData = {
  // All of the user's tracks
  tracks: Track[];
  // All of the tracks without any labels indexed by id
  unlabeledTracks: Set<number>;
  // An index of the user's labels and tracks by id
  // The key is the label id, and the value is a set of the label's track ids
  indexedLabels: Map<number, Set<number>>;
};

// Use a WeakMap so that as soon as the cache token that the caller is holding
// onto goes out of scope, the cache item is removed as well
// Store promises to the filter data to support concurrent requests to getCriteriaMatches.
// If multiple requests to getCriteriaMatches with a new cache token are started
// simultaneously, none of will find data in the cache because it is asynchronously
// loaded. To resolve that, synchronously store a promise to the result of the
// first request and the subsequent requests can lookup and await that same promise.
const cache = new WeakMap<CacheToken, Promise<FilterData>>();

// Load the filter data from the database, uncached
async function loadFilterData(userId: number): Promise<FilterData> {
  // Query the database and build the index
  const tracks = await prisma.track.findMany({
    where: { userId },
  });
  const labels = await prisma.label.findMany({
    // Filter out smart labels
    where: { userId, smartCriteria: null },
    include: {
      tracks: { select: { id: true } },
    },
  });
  const unlabeledTracks = new Set<number>(
    difference(
      map(tracks, 'id'),
      map(
        labels.flatMap((label) => label.tracks),
        'id',
      ),
    ),
  );
  const indexedLabels = new Map<number, Set<number>>(
    labels.map((label) => [label.id, new Set(map(label.tracks, 'id'))]),
  );
  return { tracks, unlabeledTracks, indexedLabels };
}

// Load and return the data that is needed to execute a smart criteria filter
// When the optional cache token is provided, the index is only built the first
// that the cache token is provided. It is intended that the caller will create
// a cache token then use the same cache token for subsequent calls to
// getFilterData within the same request.
async function getFilterData(
  userId: number,
  cacheToken?: CacheToken,
): Promise<FilterData> {
  // Attempt to lookup the data from the cache
  const existingIndex = cacheToken && cache.get(cacheToken);
  if (existingIndex) {
    return existingIndex;
  }

  const dataPromise = loadFilterData(userId);
  if (cacheToken) {
    // Cache the data under the provided cache token
    cache.set(cacheToken, dataPromise);
  }
  return dataPromise;
}

// Return an array of the tracks that match a given criteria string
export async function getCriteriaMatches(
  userId: number,
  criteria: string,
  cacheToken?: CacheToken,
): Promise<Track[]> {
  const { tracks, unlabeledTracks, indexedLabels } = await getFilterData(
    userId,
    cacheToken,
  );

  // Parsing the smart criteria produces an evaluator function that when provided
  // a way to look up the values for value identifiers determines whether a track
  // matches the criteria
  const state = parser.save();
  parser.feed(criteria);
  const evaluator = parser.results[0] as (get: GetFunc) => void;
  // Save and restore the parser state so that we can reuse the parser instance
  parser.restore(state);
  return tracks.filter((track) =>
    // Pass the evaluator a get method that looks up the values of each value
    // identifier passed in
    evaluator((keywordRaw) => {
      const keyword = keywordSchema.parse(keywordRaw);

      if (keyword.name === 'explicit') {
        return track.explicit;
      }
      if (keyword.name === 'clean') {
        return !track.explicit;
      }

      if (keyword.name === 'unlabeled') {
        return unlabeledTracks.has(track.id);
      }

      if (keyword.name === 'added' || keyword.name === 'released') {
        const { operation, extract, rhs } = keyword;
        const date =
          keyword.name === 'added' ? track.dateAdded : track.dateReleased;
        return operation(extract(date), rhs);
      }

      if (keyword.name === 'label') {
        const { labelId } = keyword;
        const labelTracks = indexedLabels.get(labelId);
        if (!labelTracks) {
          throw new Error(`Referenced non-existent label "${labelId}"`);
        }

        return labelTracks.has(track.id);
      }

      throw new Error(`Invalid keyword`);
    }),
  );
}

// Return a boolean indicating whether the smart criteria is valid
export async function validateSmartCriteria(
  userId: number,
  criteria: string,
): Promise<boolean> {
  try {
    await getCriteriaMatches(userId, criteria);
    return true;
  } catch (err) {
    return false;
  }
}
