import VideoBlock from './VideoBlock';

export default function VideoCard({ en, ar, vid, tips, badge }) {
  return (
    <div className="info-card">
      {badge && <div className="badge badge-accent">{badge}</div>}
      <h3>{en}</h3>
      {ar && <div className="ar">{ar}</div>}
      <VideoBlock vid={vid} />
      {tips && (
        <ul className="tips">
          {tips.map((t, ti) => (
            <li key={ti}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
