import { useState } from 'react';
import { Play } from 'lucide-react';

export default function VideoBlock({ vid }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="video-wrap">
        <iframe
          src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`}
          title="Exercise demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="video-wrap">
      <img loading="lazy" src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} alt="Video preview" />
      <button className="playbtn" onClick={() => setPlaying(true)} aria-label="Play demo video">
        <span className="circle">
          <Play size={18} fill="#111" color="#111" />
        </span>
      </button>
      <span className="yt-label">▶ Watch demo</span>
    </div>
  );
}
