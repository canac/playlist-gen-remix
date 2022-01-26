import { Box, Pagination, PaginationItem } from '@mui/material';
import { PrismaClient, Label, Track } from '@prisma/client';
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
import { ensureAuthenticated } from '~/middleware';

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

  const url = new URL(request.url);
  // Silently ignore invalid pages because we want don't want an error just because of a bad query string
  const qsPage = parseInt(url.searchParams.get('page') ?? '', 10);
  // Pages in the query string are 1-index, but we need a 0-indexed
  const trackPage = Number.isNaN(qsPage) ? 0 : qsPage - 1;

  // Get the access token from the database
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tracks: {
        // Hide smart labels
        include: { labels: { where: { smartCriteria: null } } },
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

  return json({
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
      <Box
        sx={{ marginBottom: '1em', display: 'flex', justifyContent: 'center' }}
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
    </>
  );
}
