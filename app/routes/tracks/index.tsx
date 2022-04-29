import { Box, Pagination, PaginationItem } from '@mui/material';
import { Album, Artist, Label, Track } from '@prisma/client';
import React from 'react';
import {
  Link,
  LoaderFunction,
  MetaFunction,
  json,
  redirect,
  useLoaderData,
} from 'remix';
import TrackList from '~/components/TrackList';
import { extractIntFromSearchParams } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import { attemptOr } from '~/lib/util';

type IndexData = {
  tracks: (Track & {
    album: Album;
    artists: Artist[];
    labels: Label[];
  })[];
  labels: Label[];
  pageIndex: number;
  pageCount: number;
};

export const loader: LoaderFunction = async ({ request }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  const trackPageSize = 20;

  // Silently ignore invalid pages because we want don't want an error just because of a bad query string
  const trackPage = attemptOr(
    // Subtract one because the query string page is 1-indexed, but we need a 0-indexed page
    () =>
      extractIntFromSearchParams(new URL(request.url).searchParams, 'page') - 1,
    // Default to the first page
    0,
  );

  // Get the user and their tracks and labels from the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tracks: {
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
      // Hide smart labels
      labels: { where: { smartCriteria: null } },
      _count: {
        select: { tracks: true },
      },
    },
  });
  if (user === null) {
    throw redirect('/auth/login');
  }

  const numTrackPages = Math.ceil(user._count.tracks / trackPageSize);

  return json<IndexData>({
    tracks: user.tracks,
    labels: user.labels,
    pageCount: Math.max(numTrackPages, 1),
    pageIndex: trackPage,
  });
};

export const meta: MetaFunction = () => ({
  title: 'Playlist Gen | Tracks',
  description: 'Generate Spotify playlists from labeled tracks',
});

export default function Index() {
  const data = useLoaderData<IndexData>();

  const [page] = React.useState(data.pageIndex + 1);

  return (
    <>
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
            defaultPage={page}
            shape="rounded"
            color="primary"
            size="large"
            renderItem={(item) => (
              <PaginationItem
                component={Link}
                to={
                  item.page === null || item.page === 1
                    ? './'
                    : `./?page=${item.page}`
                }
                {...item}
              />
            )}
          />
        </Box>
      )}
    </>
  );
}
