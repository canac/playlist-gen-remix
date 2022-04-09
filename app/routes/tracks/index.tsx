import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Autocomplete } from '@mantine/core';
import { Box, Pagination, PaginationItem } from '@mui/material';
import { Album, Artist, Label, Track } from '@prisma/client';
import { useEffect, useState } from 'react';
import {
  Form,
  Link,
  LoaderFunction,
  MetaFunction,
  json,
  redirect,
  useLoaderData,
} from 'remix';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import FaIcon from '~/components/FaIcon';
import TrackList from '~/components/TrackList';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import { generatePrismaFilter } from '~/lib/smartLabel.server';
import { buildUrl } from '~/lib/util';

type CriteriaExample = {
  value: string;
  description: string;
};

type IndexData = {
  tracks: (Track & {
    album: Album;
    artists: Artist[];
    labels: Label[];
  })[];
  labels: Label[];
  pageIndex: number;
  pageCount: number;
  search: string;
  criteriaExamples: CriteriaExample[];
};

const searchParams = zfd.formData({
  page: zfd.numeric(z.number().min(1)).optional(),
  search: z.string().optional(),
});

export const loader: LoaderFunction = async ({ request }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  const trackPageSize = 20;

  const params = searchParams.parse(new URL(request.url).searchParams);

  // Subtract one because the query string page is 1-indexed, but we need a 0-indexed page
  // Default to the first page
  const trackPage = (params.page ?? 1) - 1;
  // Convert empty search string to null
  const search = params.search || '';

  const where = search ? generatePrismaFilter(search) ?? {} : {};

  // Get the user and their tracks and labels from the database
  const userPromise = prisma.user.findUnique({
    where: { id: userId },
    include: {
      tracks: {
        where,
        include: {
          album: true,
          artists: true,
          // Include regular labels, but hide smart labels
          labels: { where: { smartCriteria: null } },
        },
        orderBy: [{ dateAdded: 'desc' }],
        skip: trackPage * trackPageSize,
        take: trackPageSize,
      },
      // Include regular labels, but hide smart labels
      labels: { where: { smartCriteria: null } },
    },
  });
  // Count the number of tracks that match the search
  const tracksCountPromise = prisma.track.count({
    where: { userId, ...where },
  });
  const [user, numTracks] = await Promise.all([
    userPromise,
    tracksCountPromise,
  ]);
  if (user === null) {
    throw redirect('/auth/login');
  }

  const criteriaExamples: CriteriaExample[] = [
    { value: 'clean', description: 'Clean' },
    { value: 'explicit', description: 'Explicit' },
    { value: 'unlabeled', description: 'Unlabeled' },

    { value: 'added=2020', description: 'Added in 2020' },
    { value: 'added<=2020', description: 'Added before or in 2020' },
    { value: 'added>2020', description: 'Added after 2020' },
    { value: 'added<4-1-2020', description: 'Added before April 1, 2020' },
    {
      value: 'added>=4-1-2020',
      description: 'Added after or on April 1, 2020',
    },
    { value: 'added=7d', description: 'Added 7 days ago' },
    { value: 'added<3m', description: 'Added less than 3 months ago' },
    { value: 'added>=1y', description: 'Added more than 1 year ago' },

    { value: 'released=2020', description: 'Released in 2020' },
    { value: 'released<=2020', description: 'Released before or in 2020' },
    { value: 'released>2020', description: 'Released after 2020' },
    {
      value: 'released<4-1-2020',
      description: 'Released before April 1, 2020',
    },
    {
      value: 'released>=4-1-2020',
      description: 'Released after or on April 1, 2020',
    },
    { value: 'released=7d', description: 'Released 7 days ago' },
    { value: 'released<3m', description: 'Released less than 3 months ago' },
    { value: 'released>=1y', description: 'Released more than 1 year ago' },

    ...user.labels.map((label) => ({
      value: `label:${label.id}`,
      description: `Has label "${label.name}"`,
    })),

    { value: 'artist:"Taylor Swift"', description: 'Artist is Taylor Swift' },
  ];

  const numTrackPages = Math.ceil(numTracks / trackPageSize);
  const { labels, tracks } = user;
  return json<IndexData>({
    tracks,
    labels,
    pageCount: Math.max(numTrackPages, 1),
    pageIndex: trackPage,
    search,
    criteriaExamples,
  });
};

export const meta: MetaFunction = () => ({
  title: 'Playlist Gen | Tracks',
  description: 'Generate Spotify playlists from labeled tracks',
});

export default function Index() {
  const data = useLoaderData<IndexData>();

  const [search, setSearch] = useState(data.search);

  const criteriaExamples = data.criteriaExamples.map(
    ({ value, description }) => {
      // Break the search query into the tail (the incomplete search term) and
      // the head (the rest of the search)
      const matches = /^(.*?[!(]*)([\S]*)$/.exec(search);
      if (!matches) {
        throw new Error('Failed to match search');
      }
      const searchHead = matches[1];

      return {
        value: `${searchHead}${value}`,
        label: `${
          searchHead.length === 0 ? '' : '... '
        }${value} (${description})`,
      };
    },
  );

  // Sync the pagination page with the page in the query when it changes
  const [page, setPage] = useState(data.pageIndex + 1);
  useEffect(() => {
    setPage(data.pageIndex + 1);
  }, [data.pageIndex]);

  return (
    <>
      <Form style={{ padding: '1em' }}>
        <Autocomplete
          label="Search"
          name="search"
          defaultValue={search}
          onChange={setSearch}
          size="md"
          rightSection={<FaIcon icon={faMagnifyingGlass} />}
          data={criteriaExamples}
          limit={10}
        />
      </Form>
      <TrackList tracks={data.tracks} labels={data.labels}></TrackList>
      {data.pageCount > 1 && (
        <Box
          sx={{
            marginBottom: '1em',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Pagination
            count={data.pageCount}
            page={page}
            shape="rounded"
            color="primary"
            size="large"
            renderItem={(item) => (
              <PaginationItem
                component={Link}
                to={buildUrl('./', [
                  { name: 'page', defaultValue: 1, value: item.page },
                  { name: 'search', defaultValue: '', value: data.search },
                ])}
                {...item}
              />
            )}
          />
        </Box>
      )}
    </>
  );
}
