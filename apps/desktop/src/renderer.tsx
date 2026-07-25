import {
  StrictMode,
} from 'react';

import {
  createRoot,
} from 'react-dom/client';

import {
  HashRouter,
} from 'react-router';

import App from './App';

import {
  AuthProvider,
} from './auth/AuthContext';

import './index.css';

const rootElement =
  document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'The root element could not be found.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);