import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowDown,
  faCloudArrowUp,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {
  AppBar,
  Avatar,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { PrismaClient, Label, Track } from '@prisma/client';
import {
  useLoaderData,
  json,
  redirect,
  MetaFunction,
  LoaderFunction,
  Form,
} from 'remix';
import TrackList from '~/components/TrackList';
import { ensureAuthenticated } from '~/middleware';

type IndexData = {
  avatarUrl: string | null;
  tracks: (Track & {
    labels: Label[];
  })[];
  labels: Label[];
};

export const loader: LoaderFunction = async ({ request }) => {
  // Get the user ID from the session
  const userId = await ensureAuthenticated(request);

  // Get the access token from the database
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tracks: {
        include: { labels: true },
        take: 10,
      },
      labels: true,
    },
  });
  if (user === null) {
    throw redirect('/auth/login');
  }

  return json({
    avatarUrl: user.avatarUrl,
    tracks: user.tracks,
    labels: user.labels,
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

  return (
    <>
      <AppBar position="static">
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
          <IconButton size="large" color="inherit">
            {data.avatarUrl ? (
              <Avatar alt="User avatar" src={data.avatarUrl} />
            ) : (
              <FontAwesomeIcon icon={faUser} />
            )}
          </IconButton>
        </Toolbar>
      </AppBar>
      <TrackList tracks={data.tracks} labels={data.labels}></TrackList>
    </>
  );
}
