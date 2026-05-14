import React from 'react';
import { useApp } from '../context/AppContext';
import { X } from 'lucide-react';

export default function MediaPlayerModal() {
  const { mediaPlayer, closePlayer } = useApp();
  const { isOpen, url, title, type } = mediaPlayer;

  if (!isOpen) return null;

  // Transform YouTube / normal links cleanly to valid embed URL
  let embedUrl = url;
  let isIframe = true;
  let isHtmlVideo = url.endsWith('.mp4');
  let isHtmlAudio = url.endsWith('.mp3');

  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1];
    if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
  } else if (url.includes('facebook.com')) {
    // Official Facebook embed video plugin formatting
    embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=500`;
  } else if (isHtmlVideo || isHtmlAudio) {
    isIframe = false;
  }

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
          {isIframe ? (
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
              src={url} 
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
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <audio src={url} controls autoPlay style={{ width: '100%' }} />
            </div>
          )}
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
