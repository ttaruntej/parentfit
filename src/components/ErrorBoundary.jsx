import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { err: null };

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    console.error('Render error:', err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-head)' }}>Something went wrong.</h2>
          <pre style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxWidth: 480 }}>
            {String(this.state.err)}
          </pre>
          <button className="btn btn-fire" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
