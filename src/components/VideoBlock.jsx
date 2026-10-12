import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { youtubeIdFromUrl, youtubeUrl } from '../data/library';

/**
 * Demo media for an exercise. Accepts either the stored `media` object
 * ({ url, start, source, verified }) or a bare YouTube id (`vid`, used by the
 * warm-up / cool-down reference cards).
 *
 * Lazy by design: nothing but a thumbnail <img loading="lazy"> is fetched until
 * the user taps play, so a screen full of exercises stays cheap on mobile data.
 * No media → an explicit "No media yet" (never a guessed link).
 */
export default function VideoBlock({ vid, media }) {
  const [playing, setPlaying] = useState(false);
  const url = media?.url || (vid ? youtubeUrl(vid) : null);
  const id = vid || youtubeIdFromUrl(url);
  const start = media?.start || 0;

  if (!url) return <div className="media-empty">No media yet</div>;

  if (!id) {
    return (
      <a className="media-link" href={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={14} style={{ verticalAlign: -2 }} /> Open demo{media?.source ? ` (${media.source})` : ''}
      </a>
    );
  }

  const caption = (media?.source || media?.note) && (
    <div className="hint" style={{ margin: '4px 0 8px' }}>
      {media.source ? `${media.source}` : ''}
      {media.note ? ` — ${media.note}` : ''}
    </div>
  );

  if (playing) {
    return (
      <>
      <div className="video-wrap">
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ''}`}
          title="Exercise demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {caption}
      </>
    );
  }

  return (
    <>
    <div className="video-wrap">
      <img loading="lazy" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="Video preview" />
      <button className="playbtn" onClick={() => setPlaying(true)} aria-label="Play demo video">
        <span className="circle">
          <Play size={18} fill="#111" color="#111" />
        </span>
      </button>
      <span className="yt-label">▶ Watch demo</span>
    </div>
    {caption}
    </>
  );
}
