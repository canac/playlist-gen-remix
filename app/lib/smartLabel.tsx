import { Track } from '@prisma/client';
import { map } from 'lodash';
import { Parser, Grammar } from 'nearley';
import grammar from '~/labelGrammar';
import { prisma } from '~/prisma.server';

// Initialize the parser for the smart label criteria
const parser = new Parser(Grammar.fromCompiled(grammar));

// Return an array of the tracks that match a given criteria string
export async function getCriteriaMatches(
  userId: number,
  criteria: string,
): Promise<Track[]> {
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

  // Index the labels and their tracks by id
  // The key is the label id, and the value is a set of the label's track ids
  const indexedLabels = new Map<number, Set<number>>(
    labels.map((label) => [label.id, new Set(map(label.tracks, 'id'))]),
  );

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
