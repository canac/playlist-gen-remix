import { Box, Pagination, PaginationItem } from '@mui/material';
import { Label } from '@prisma/client';
import React from 'react';
import {
  Link,
  LoaderFunction,
  MetaFunction,
  Outlet,
  json,
  redirect,
  useLoaderData,
} from 'remix';
import LabelList from '~/components/LabelList';
import { extractIntFromSearchParams } from '~/lib/helpers.server';
import { ensureAuthenticated } from '~/lib/middleware.server';
import { prisma } from '~/lib/prisma.server';
import { generatePrismaFilter } from '~/lib/smartLabel.server';
import { attemptOr, buildUrl } from '~/lib/util';

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

  // Count the number of tracks matching a smart label
  async function countTracks(smartCriteria: string): Promise<number> {
    const where = generatePrismaFilter(smartCriteria);
    if (where === null) {
      return 0;
    }
    const tracks = await prisma.track.findMany({
      where: { userId, ...where },
      select: { id: true },
    });
    return tracks.length;
  }

  // Calculate the track counts
  const labels = await Promise.all(
    user.labels.map(async ({ _count, ...label }) => {
      const numTracks =
        label.smartCriteria === null
          ? _count.tracks
          : await countTracks(label.smartCriteria);
      return { ...label, numTracks };
    }),
  );

  return json<LabelsData>({
    labels,
    pageCount: Math.max(numPages, 1),
    pageIndex: page,
  });
};

export const meta: MetaFunction = () => ({
  title: 'Playlist Gen | Labels',
});

export default function Labels() {
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
                to={buildUrl('/labels', [
                  { name: 'page', defaultValue: 1, value: item.page },
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
