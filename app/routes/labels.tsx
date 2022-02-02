import { Box, Pagination, PaginationItem } from '@mui/material';
import { Label, Track } from '@prisma/client';
import {
  useLoaderData,
  json,
  redirect,
  Link,
  LoaderFunction,
  MetaFunction,
  Outlet,
} from 'remix';
import React from 'react';
import LabelList from '~/components/LabelList';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { extractIntFromSearchParams } from '~/lib/helpers.server';
import { attemptOr } from '~/lib/util';
import { prisma } from '~/lib/prisma.server';
import { getCriteriaMatches } from '~/lib/smartLabel.server';
import CacheToken from '~/lib/cacheToken';

type LabelsData = {
  labels: (Label & {
    numTracks: number;
  })[];
  pageIndex: number;
  pageCount: number;
};

export const loader: LoaderFunction = async ({ request }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  const pageSize = 20;

  // Silently ignore invalid pages because we want don't want an error just because of a bad query string
  const page = attemptOr(
    // Subtract one because the query string page is 1-indexed, but we need a 0-indexed page
    () =>
      extractIntFromSearchParams(new URL(request.url).searchParams, 'page') - 1,
    // Default to the first page
    0,
  );

  // Get the user's labels from the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      labels: {
        skip: page * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { tracks: true },
          },
        },
      },
      _count: {
        select: { labels: true },
      },
    },
  });
  if (user === null) {
    throw redirect('/auth/login');
  }

  const numPages = Math.ceil(user._count.labels / pageSize);

  // Calculate the track count of smart labels
  const cacheToken = new CacheToken();
  for (const label of user.labels) {
    if (label.smartCriteria !== null) {
      const countTracksPromise = getCriteriaMatches(
        userId,
        label.smartCriteria,
        cacheToken,
      )
        .then((matches) => matches.length)
        // Suppress errors calculating the matches and default to 0
        .catch(() => 0);
      label._count.tracks = await countTracksPromise;
    }
  }

  return json<LabelsData>({
    labels: user.labels.map(({ _count, ...label }) => ({
      ...label,
      numTracks: _count.tracks,
    })),
    pageCount: Math.max(numPages, 1),
    pageIndex: page,
  });
};

export const meta: MetaFunction = () => {
  return {
    title: 'Playlist Gen | Labels',
  };
};

export default function Index() {
  const data = useLoaderData<LabelsData>();

  const [page] = React.useState(data.pageIndex + 1);

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        <Box sx={{ flex: 1 }}>
          <LabelList labels={data.labels} />
        </Box>
        <Box sx={{ flex: 3, margin: '1em' }}>
          <Outlet />
        </Box>
      </Box>
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
              to={item.page === 1 ? '/labels' : `/labels?page=${item.page}`}
              {...item}
            />
          )}
        />
      </Box>
    </>
  );
}
