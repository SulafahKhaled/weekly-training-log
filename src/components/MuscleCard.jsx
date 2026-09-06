import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, RotateCw, Snowflake } from 'lucide-react';
import VideoBlock from './VideoBlock';

export default function MuscleCard({ muscle, dynamic, mobility, static: staticEntry }) {
  const layers = [
    dynamic && { key: 'dynamic', label: 'Dynamic', Icon: Flame, entry: dynamic },
    mobility && { key: 'mobility', label: 'Mobility', Icon: RotateCw, entry: mobility },
    staticEntry && { key: 'static', label: 'Stretch', Icon: Snowflake, entry: staticEntry },
  ].filter(Boolean);
  const [active, setActive] = useState(null);
  const activeLayer = layers.find((l) => l.key === active);

  return (
    <div className="muscle-card">
      <div className="muscle-head">
        <span className="muscle-name">{muscle.en}</span>
        {muscle.ar && <span className="ar">{muscle.ar}</span>}
      </div>
      {muscle.tips && (
        <ul className="tips">
          {muscle.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
      <div className="layer-tabs">
        {layers.map((l) => (
          <button key={l.key} className={active === l.key ? 'active' : ''} onClick={() => setActive(active === l.key ? null : l.key)}>
            <l.Icon size={12} />
            {l.label}
          </button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {activeLayer && (
          <motion.div
            key={activeLayer.key}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="layer-body">
              <div className="layer-title">
                {activeLayer.entry.en}
                {activeLayer.entry.ar && <span className="ar"> — {activeLayer.entry.ar}</span>}
              </div>
              <VideoBlock vid={activeLayer.entry.vid} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
