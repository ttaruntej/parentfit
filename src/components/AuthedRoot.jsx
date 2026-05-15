import React from 'react';
import { AppProvider } from '../context/AppContext';
import AuthenticatedApp from './AuthenticatedApp';

export default function AuthedRoot() {
  return (
    <AppProvider>
      <AuthenticatedApp />
    </AppProvider>
  );
}
