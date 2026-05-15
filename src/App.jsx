import React, { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import SignIn from './components/SignIn';
import { Dumbbell } from 'lucide-react';

const AuthedRoot = lazy(() => import('./components/AuthedRoot'));

const FullScreenSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#0a0808' }}>
    <div style={{ color: 'var(--fire)', animation: 'spin 2s linear infinite' }}>
      <Dumbbell size={48} />
    </div>
    <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Loading...</div>
  </div>
);

export default function App() {
  const { user, loadingSession } = useAuth();

  useEffect(() => {
    if (!user) document.title = 'Sign in - ParentFit';
  }, [user]);

  if (loadingSession) return <FullScreenSpinner />;
  if (!user) return <SignIn />;

  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <AuthedRoot />
    </Suspense>
  );
}
