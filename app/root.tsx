import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowDown,
  faCloudArrowUp,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {
  AppBar,
  Avatar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useLoaderData, json, Form, LoaderFunction, MetaFunction } from 'remix';
import React, { useState } from 'react';
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

import globalStylesUrl from '~/styles/global.css';

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
  // Don't require auth routes to be authenticated
  if (new URL(request.url).pathname.startsWith('/auth')) {
    return json<RootData>({
      avatarUrl: null,
    });
  }

  // Get the user from the session
  const user = await ensureUser(request);

  return json<RootData>({
    avatarUrl: user.avatarUrl,
  });
};

function Layout({ children }: { children: React.ReactNode }) {
  // useLoaderData can return undefined in the root route if there is an error somewhere
  const data = useLoaderData<RootData | undefined>();

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
            {data?.avatarUrl ? (
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
      {children}
    </div>
  );
}
