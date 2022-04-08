import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { TextInput } from '@mantine/core';
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

  const numTrackPages = Math.ceil(numTracks / trackPageSize);
  const { labels, tracks } = user;
  return json<IndexData>({
    tracks,
    labels,
    pageCount: Math.max(numTrackPages, 1),
    pageIndex: trackPage,
    search,
  });
};

export const meta: MetaFunction = () => ({
  title: 'Playlist Gen | Tracks',
  description: 'Generate Spotify playlists from labeled tracks',
});

export default function Index() {
  const data = useLoaderData<IndexData>();

  // Sync the pagination page with the page in the query when it changes
  const [page, setPage] = useState(data.pageIndex + 1);
  useEffect(() => {
    setPage(data.pageIndex + 1);
  }, [data.pageIndex]);

  return (
    <>
      <Form style={{ padding: '1em' }}>
        <TextInput
          label="Search"
          name="search"
          defaultValue={data.search}
          size="md"
          rightSection={<FaIcon icon={faMagnifyingGlass} />}
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
