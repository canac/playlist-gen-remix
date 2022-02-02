import { Box, Pagination, PaginationItem } from '@mui/material';
import { Label, Track } from '@prisma/client';
import {
  useLoaderData,
  json,
  redirect,
  Link,
  LoaderFunction,
  MetaFunction,
} from 'remix';
import React from 'react';
import TrackList from '~/components/TrackList';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { extractIntFromSearchParams } from '~/lib/helpers.server';
import { attemptOr } from '~/lib/util';
import { prisma } from '~/lib/prisma.server';

type IndexData = {
  tracks: (Track & {
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
        // Hide smart labels
        include: { labels: { where: { smartCriteria: null } } },
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

export const meta: MetaFunction = () => {
  return {
    title: 'Playlist Gen',
    description: 'Generate Spotify playlists from labeled tracks',
  };
};

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
                to={item.page === 1 ? '/' : `/?page=${item.page}`}
                {...item}
              />
            )}
          />
        </Box>
      )}
    </>
  );
}
