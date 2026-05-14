import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Plus, Trash2, Video, Headphones, FileText, ExternalLink, Search, X } from 'lucide-react';

const TYPE_ICON = { video: Video, audio: Headphones, article: FileText };
const TYPE_COLOR = { video: 'var(--fire)', audio: '#A78BFA', article: 'var(--teal)' };
const TYPE_BG = { video: 'rgba(255,107,53,0.12)', audio: 'rgba(124,58,237,0.12)', article: 'rgba(0,200,150,0.12)' };

function VideoThumb({ url, type }) {
  let yt = null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (m) yt = m[1];
  }
  const Icon = TYPE_ICON[type] || Video;
  return (
    <div className="resource-thumb">
      {yt
        ? <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} alt="thumb"
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
            onError={e => { e.target.style.display = 'none'; }} />
        : <Icon size={32} className="resource-thumb-icon" />
      }
      {yt && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
        }} />
      )}
    </div>
  );
}

function AddModal({ onClose, onAdd, syncing }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('video');
  const [tags, setTags] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!url.trim()) return;
    await onAdd({
      id: `res_${Date.now()}`,
      title: title.trim() || (url.includes('youtube') ? 'YouTube Fitness Video' : 'Fitness Resource'),
      url: url.trim(),
      type,
      addedAt: new Date().toISOString(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{
        width: '100%', maxWidth: 430, borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        borderBottom: 'none', padding: '1.5rem', animation: 'slideUp 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem' }}>Add Resource</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>URL *</label>
            <input required type="url" className="input" placeholder="https://youtube.com/watch?v=..." value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Title (optional)</label>
            <input type="text" className="input" placeholder="e.g. 10-Min Core Burn" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ background: '#1e1411' }}>
                <option value="video">🎥 Video</option>
                <option value="audio">🎧 Audio</option>
                <option value="article">📄 Article</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Tags</label>
              <input type="text" className="input" placeholder="Core, HIIT" value={tags} onChange={e => setTags(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={syncing} className="btn btn-fire btn-full" style={{ marginTop: '0.25rem' }}>
            {syncing ? '⏳ Saving...' : '+ Add Resource'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResourceHub() {
  const { resourceData, addResourceLink, deleteResourceLink, openPlayer, syncing } = useApp();
  const resources = resourceData?.resources || [];
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = useMemo(() => {
    return resources.filter(r => {
      const matchType = filterType === 'all' || r.type === filterType;
      const q = query.toLowerCase();
      const matchQ = !q || r.title?.toLowerCase().includes(q) || r.tags?.some(t => t.toLowerCase().includes(q));
      return matchType && matchQ;
    });
  }, [resources, query, filterType]);

  const isPlayable = url =>
    url.includes('youtube.com') || url.includes('youtu.be') ||
    url.includes('vimeo.com') || url.endsWith('.mp4') || url.endsWith('.mp3');

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        <input
          type="text"
          className="input"
          placeholder="Search resources..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem', paddingRight: query ? '2.5rem' : '0.875rem' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Type filter chips */}
      <div className="chip-rail">
        {['all', 'video', 'audio', 'article'].map(t => (
          <button key={t} className={`chip${filterType === t ? ' active' : ''}`} onClick={() => setFilterType(t)}>
            {t === 'all' ? 'All' : t === 'video' ? '🎥 Video' : t === 'audio' ? '🎧 Audio' : '📄 Article'}
            {t === 'all' ? ` (${resources.length})` : ` (${resources.filter(r => r.type === t).length})`}
          </button>
        ))}
      </div>

      {/* Resource cards grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {query ? `No results for "${query}"` : 'No resources saved yet.'}
          </div>
          <button className="btn btn-fire" onClick={() => setShowAdd(true)} style={{ marginTop: '1rem', borderRadius: 'var(--radius-sm)' }}>
            Add your first resource
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {filtered.map(item => {
            const canPlay = isPlayable(item.url);
            const color = TYPE_COLOR[item.type] || 'var(--fire)';
            const bg = TYPE_BG[item.type] || TYPE_BG.video;
            return (
              <div key={item.id} className="resource-card">
                <VideoThumb url={item.url} type={item.type} />
                <div className="resource-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color, background: bg, padding: '0.15rem 0.45rem', borderRadius: '999px' }}>
                      {item.type}
                    </span>
                    <button onClick={() => deleteResourceLink(item.id)} disabled={syncing} className="btn btn-danger" style={{ padding: '0.1rem' }} title="Remove">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.title}
                  </p>
                  {item.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {item.tags.slice(0, 3).map((t, i) => (
                        <span key={i} style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.35rem', borderRadius: '999px' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 'auto' }}>
                    {canPlay ? (
                      <button onClick={() => openPlayer(item.url, item.title, item.type)} className="btn btn-fire" style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}>
                        <Play size={12} /> Play
                      </button>
                    ) : (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>
                        <ExternalLink size={12} /> Open
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-h) + 1rem)',
          right: 'max(1rem, calc(50vw - 215px + 1rem))',
          width: 52, height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--fire) 0%, var(--fire-light) 100%)',
          border: 'none',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px var(--fire-glow)',
          zIndex: 300,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Add resource"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={addResourceLink} syncing={syncing} />}
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
