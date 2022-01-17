import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowDown,
  faCloudArrowUp,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  PaginationItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { PrismaClient, Label, Track } from '@prisma/client';
import {
  useLoaderData,
  json,
  redirect,
  Form,
  Link,
  LoaderFunction,
  MetaFunction,
} from 'remix';
import React, { useState } from 'react';
import TrackList from '~/components/TrackList';
import { ensureAuthenticated } from '~/middleware';

type IndexData = {
  avatarUrl: string | null;
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
        include: { labels: true },
        skip: trackPage * trackPageSize,
        take: trackPageSize,
      },
      labels: true,
    },
  });
  if (user === null) {
    throw redirect('/auth/login');
  }

  const numTrackPages = Math.ceil(
    (await prisma.track.count({ where: { userId } })) / trackPageSize,
  );

  return json({
    avatarUrl: user.avatarUrl,
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

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Playlist Generator
          </Typography>
          <Form action="/sync/pullTracks" method="post" replace>
            <Tooltip title="Pull tracks from Spotify">
              <IconButton type="submit" size="large" color="inherit">
                <FontAwesomeIcon icon={faCloudArrowDown} />
              </IconButton>
            </Tooltip>
          </Form>
          <Form action="/sync/pushTracks" method="post" replace>
            <Tooltip title="Push playlists to Spotify">
              <IconButton type="submit" size="large" color="inherit">
                <FontAwesomeIcon icon={faCloudArrowUp} />
              </IconButton>
            </Tooltip>
          </Form>
          <IconButton size="large" color="inherit" onClick={openMenu}>
            {data.avatarUrl ? (
              <Avatar alt="User avatar" src={data.avatarUrl} />
            ) : (
              <FontAwesomeIcon icon={faUser} />
            )}
          </IconButton>
          <Menu
            sx={{ mt: '56px' }}
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={closeMenu}
          >
            <MenuItem onClick={closeMenu}>
              <Form action="/auth/logout" method="post">
                <Button type="submit">Logout</Button>
              </Form>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <TrackList tracks={data.tracks} labels={data.labels}></TrackList>
      <Box
        sx={{ marginBottom: '1em', display: 'flex', justifyContent: 'center' }}
      >
        <Pagination
          count={data.pageCount}
          defaultPage={data.pageIndex + 1}
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
