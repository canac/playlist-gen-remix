import React from 'react';
import { hydrate } from 'react-dom';
import { RemixBrowser } from 'remix';

hydrate(
  <React.StrictMode>
    <RemixBrowser />
  </React.StrictMode>,
  document,
);
