export function parseMediaUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;

    const host = u.hostname.replace(/^www\./, '');
    const pathname = u.pathname;

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      return id
        ? { kind: 'youtube', id, embed: `https://www.youtube.com/embed/${id}?autoplay=1` }
        : null;
    }

    if (host === 'youtu.be') {
      const id = pathname.replace(/^\//, '').split('/')[0];
      return id
        ? { kind: 'youtube', id, embed: `https://www.youtube.com/embed/${id}?autoplay=1` }
        : null;
    }

    if (host === 'vimeo.com') {
      const id = pathname.replace(/^\//, '').split('/')[0];
      return id
        ? { kind: 'vimeo', id, embed: `https://player.vimeo.com/video/${id}?autoplay=1` }
        : null;
    }

    if (host === 'facebook.com' || host === 'fb.watch') {
      return {
        kind: 'facebook',
        embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=500`,
      };
    }

    const lowerPath = pathname.toLowerCase();
    if (lowerPath.endsWith('.mp4')) return { kind: 'mp4', src: raw };
    if (lowerPath.endsWith('.mp3')) return { kind: 'mp3', src: raw };
    return null;
  } catch {
    return null;
  }
}

export const isPlayable = (raw) => parseMediaUrl(raw) !== null;
