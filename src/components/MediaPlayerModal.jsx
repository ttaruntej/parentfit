import React from 'react';
import { useApp } from '../context/AppContext';
import { X } from 'lucide-react';
import { parseMediaUrl } from '../lib/url';

export default function MediaPlayerModal() {
  const { mediaPlayer, closePlayer } = useApp();
  const { isOpen, url, title } = mediaPlayer;

  if (!isOpen) return null;

  const media = parseMediaUrl(url);
  const isIframe = ['youtube', 'vimeo', 'facebook'].includes(media?.kind);
  const isHtmlVideo = media?.kind === 'mp4';
  const isHtmlAudio = media?.kind === 'mp3';
  const embedUrl = media?.embed;
  const sourceUrl = media?.src || url;

  return (
    <div 
      onClick={closePlayer}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '850px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--fire)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Now Playing: {title || 'Workout Track'}
          </h4>
          <button 
            onClick={closePlayer}
            className="btn btn-ghost btn-icon"
          >
            <X size={18} />
          </button>
        </div>

        {/* Media Frame Container */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          paddingTop: isIframe || isHtmlVideo ? '56.25%' : 'auto',
          background: '#000',
          borderRadius: '0.5rem',
          overflow: 'hidden'
        }}>
          {!media ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              This resource cannot be played inline.
            </div>
          ) : isIframe ? (
            <iframe
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          ) : isHtmlVideo ? (
            <video 
              src={sourceUrl} 
              controls 
              autoPlay 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}
            />
          ) : isHtmlAudio ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <audio src={sourceUrl} controls autoPlay style={{ width: '100%' }} />
            </div>
          ) : null}
        </div>

        {/* Permanent Fallback Launch Helper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tap outside to close</span>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-ghost" 
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', textDecoration: 'none', borderRadius: 'var(--radius-sm)' }}
          >
            Open directly ↗
          </a>
        </div>
      </div>
    </div>
  );
}
