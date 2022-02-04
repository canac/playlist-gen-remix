import { Track } from '@prisma/client';
import { map } from 'lodash';
import { Grammar, Parser } from 'nearley';
import CacheToken from '~/lib/cacheToken';
import grammar from '~/lib/labelGrammar.server';
import { prisma } from '~/lib/prisma.server';

// Initialize the parser for the smart label criteria
const parser = new Parser(Grammar.fromCompiled(grammar));

type FilterData = {
  // All of the user's tracks
  tracks: Track[];
  // An index of the user's labels and tracks by id
  // The key is the label id, and the value is a set of the label's track ids
  indexedLabels: Map<number, Set<number>>;
};

// Use a WeakMap so that as soon as the cache token that the caller is holding
// onto goes out of scope, the cache item is removed as well
const cache = new WeakMap<CacheToken, FilterData>();

// Load and return the data that is needed to execute a smart criteria filter
// When the optional cache token is provided, the index is only built the first
// that the cache token is provided. It is intended that the caller will create
// a cache token then use the same cache token for subsequent calls to
// getFilterData within the same request.
export async function getFilterData(
  userId: number,
  cacheToken?: CacheToken,
): Promise<FilterData> {
  // Attempt to lookup the data from the cache
  const existingIndex = cacheToken && cache.get(cacheToken);
  if (existingIndex) {
    return existingIndex;
  }

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
  const indexedLabels = new Map<number, Set<number>>(
    labels.map((label) => [label.id, new Set(map(label.tracks, 'id'))]),
  );
  if (cacheToken) {
    // Cache the data under the provided cache token
    cache.set(cacheToken, { tracks, indexedLabels });
  }
  return { tracks, indexedLabels };
}

// Return an array of the tracks that match a given criteria string
export async function getCriteriaMatches(
  userId: number,
  criteria: string,
  cacheToken?: CacheToken,
): Promise<Track[]> {
  const { tracks, indexedLabels } = await getFilterData(userId, cacheToken);

  // Parsing the smart criteria produces an evaluator function that when provided
  // a way to look up the values for value identifiers determines whether a track
  // matches the criteria
  const state = parser.save();
  parser.feed(criteria);
  const evaluator = parser.results[0];
  // Save and restore the parser state so that we can reuse the parser instance
  parser.restore(state);
  return tracks.filter((track) =>
    // Pass the evaluator a method that looks up the values of each value identifier passed in
    evaluator((value: string): boolean => {
      if (value === 'explicit') {
        return track.explicit;
      }
      if (value === 'clean') {
        return !track.explicit;
      }

      const yearMatches = /^year:(?<year>\d+)$/.exec(value);
      if (yearMatches?.groups) {
        const year = parseInt(yearMatches.groups.year, 10);
        return track.dateAdded.getFullYear() === year;
      }

      const labelMatches = /^label:(?<labelId>\d+)$/.exec(value);
      if (labelMatches?.groups) {
        const labelId = parseInt(labelMatches.groups.labelId, 10);
        const labelTracks = indexedLabels.get(labelId);
        if (!labelTracks) {
          throw new Error(`Referenced non-existent label "${labelId}"`);
        }

        return labelTracks.has(track.id);
      }

      throw new Error(`Invalid value "${value}"`);
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
