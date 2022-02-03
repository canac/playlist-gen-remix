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
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import {
  useLoaderData,
  json,
  Form,
  LoaderFunction,
  MetaFunction,
  useFetcher,
  Link,
} from 'remix';
import React, { useEffect, useState } from 'react';
import { ensureUser } from '~/lib/middleware.server';
import {
  Links,
  LinksFunction,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
} from 'remix';
import FaIcon from '~/components/FaIcon';

import globalStylesUrl from '~/styles/global.css';
import toastifyStylesUrl from 'react-toastify/dist/ReactToastify.css';

type RootData = {
  avatarUrl: string | null;
};

export const links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: globalStylesUrl },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap',
    },
    { rel: 'stylesheet', href: toastifyStylesUrl },
  ];
};

export const meta: MetaFunction = () => {
  return {
    description: 'Generate Spotify playlists from labeled tracks',
  };
};

export default function App() {
  return (
    <Document>
      <Layout>
        <Outlet />
      </Layout>
    </Document>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <Document title="Error!">
      <Layout>
        <div>
          <h1>There was an error</h1>
          <p>{error.message}</p>
          <hr />
          <p>
            Hey, developer, you should replace this with what you want your
            users to see.
          </p>
        </div>
      </Layout>
    </Document>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  let message;
  switch (caught.status) {
    case 401:
      message = (
        <p>
          Oops! Looks like you tried to visit a page that you do not have access
          to.
        </p>
      );
      break;
    case 404:
      message = (
        <p>Oops! Looks like you tried to visit a page that does not exist.</p>
      );
      break;

    default:
      throw new Error(caught.data || caught.statusText);
  }

  return (
    <Document title={`${caught.status} ${caught.statusText}`}>
      <Layout>
        <h1>
          {caught.status}: {caught.statusText}
        </h1>
        {message}
      </Layout>
    </Document>
  );
}

function Document({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  );
}

export const loader: LoaderFunction = async ({ request }) => {
  try {
    // Get the user from the session
    const user = await ensureUser(request);

    return json<RootData>({
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    // Don't require auth routes to be authenticated
    if (new URL(request.url).pathname.startsWith('/auth')) {
      return json<RootData>({
        avatarUrl: null,
      });
    } else {
      throw err;
    }
  }
};

function Layout({ children }: { children: React.ReactNode }) {
  // useLoaderData can return undefined in the root route if there is an error somewhere
  const data = useLoaderData<RootData | undefined>();

  const pullFetcher = useFetcher<{ success: boolean }>();
  const pushFetcher = useFetcher<{ success: boolean }>();

  useEffect(() => {
    if (pullFetcher.type === 'done') {
      if (pullFetcher.data.success) {
        toast.success('Pulling tracks succeeded!', { hideProgressBar: true });
      } else {
        toast.error('Pulling tracks failed!', { hideProgressBar: true });
      }
    }
  }, [pullFetcher.type]);

  useEffect(() => {
    if (pushFetcher.type === 'done') {
      if (pushFetcher.data.success) {
        toast.success('Pushing tracks succeeded!', { hideProgressBar: true });
      } else {
        toast.error('Pushing tracks failed!', { hideProgressBar: true });
      }
    }
  }, [pushFetcher.type]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  return (
    <div className="remix-app">
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h4" component="h1" sx={{ marginRight: '1em' }}>
            Playlist Generator
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            <Button component={Link} to="/tracks" color="inherit">
              Tracks
            </Button>
            <Button component={Link} to="/labels" color="inherit">
              Labels
            </Button>
          </Box>
          <pullFetcher.Form action="/sync/pullTracks" method="post">
            <Tooltip title="Pull tracks from Spotify">
              <IconButton
                type="submit"
                size="large"
                color="inherit"
                disabled={pullFetcher.state === 'submitting'}
              >
                <FaIcon icon={faCloudArrowDown} />
              </IconButton>
            </Tooltip>
          </pullFetcher.Form>
          <pushFetcher.Form action="/sync/pushTracks" method="post">
            <Tooltip title="Push playlists to Spotify">
              <IconButton
                type="submit"
                size="large"
                color="inherit"
                disabled={pushFetcher.state === 'submitting'}
              >
                <FaIcon icon={faCloudArrowUp} />
              </IconButton>
            </Tooltip>
          </pushFetcher.Form>
          <IconButton size="large" color="inherit" onClick={openMenu}>
            {data?.avatarUrl ? (
              <Avatar alt="User avatar" src={data.avatarUrl} />
            ) : (
              <FaIcon icon={faUser} />
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
      <ToastContainer />
      {children}
    </div>
  );
}
