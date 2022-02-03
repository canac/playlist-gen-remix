import { Box, Button } from '@mui/material';
import { redirect, ActionFunction, Form, MetaFunction } from 'remix';
import { getSession, destroySession } from '~/lib/sessions.server';

// Log the user out and redirect them to the login page
export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  return redirect('/auth/login', {
    headers: { 'Set-Cookie': await destroySession(session) },
  });
};

export const meta: MetaFunction = () => {
  return {
    title: 'Playlist Gen | Logout',
  };
};

// Form to support no-JS
export default function LogoutRoute() {
  return (
    <Box
      component={Form}
      sx={{
        margin: '1em',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      method="post"
      action="/auth/logout"
    >
      <Button type="submit">Logout</Button>
    </Box>
  );
}
