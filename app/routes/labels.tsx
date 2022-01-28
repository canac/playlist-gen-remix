import { Box, Pagination, PaginationItem } from '@mui/material';
import { PrismaClient, Label, Track } from '@prisma/client';
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
import { ensureAuthenticated } from '~/lib/middleware';
import { extractIntFromSearchParams } from '~/lib/helpers';
import { attemptOr } from '~/lib/util';

type LabelsData = {
  tracks: (Track & {
    labels: Label[];
  })[];
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
  const prisma = new PrismaClient();
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

  return json({
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
        <Box sx={{ flex: 3 }}>
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
