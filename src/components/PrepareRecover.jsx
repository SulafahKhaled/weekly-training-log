import { Sparkles } from 'lucide-react';
import MuscleCard from './MuscleCard';
import VideoCard from './VideoCard';
import { buildDayRecovery } from '../data/recovery';

export default function PrepareRecover({ dayId }) {
  const { cards, extras } = buildDayRecovery(dayId);
  if (cards.length === 0) return null;

  return (
    <>
      <div className="section-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} /> Prepare &amp; Recover
        </span>
        <span className="line" />
      </div>
      <div className="hint">Every muscle this day trains, with the dynamic warm-up, mobility drill, and static stretch that go with it. Tap a tab to preview.</div>
      <div className="recover-grid">
        {cards.map((card) => (
          <MuscleCard key={card.key} muscle={card.muscle} dynamic={card.dynamic} mobility={card.mobility} static={card.muscle} />
        ))}
      </div>
      {extras.length > 0 && (
        <>
          <div className="hint" style={{ marginTop: 16 }}>
            Also relevant today:
          </div>
          {extras.map((entry) => (
            <VideoCard key={entry.key} en={entry.en} tips={entry.tips} vid={entry.vid} />
          ))}
        </>
      )}
    </>
  );
}
