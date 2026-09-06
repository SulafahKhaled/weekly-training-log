import { motion } from 'framer-motion';
import VideoCard from './VideoCard';

export default function InfoPage({ info }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="info-hero">
        <div className="badge">{info.ar}</div>
        <h2>{info.title}</h2>
        <p>{info.blurb}</p>
      </div>
      {info.videos.map((v, i) => (
        <VideoCard key={i} en={v.en} ar={v.ar} vid={v.vid} tips={v.tips} badge={v.badge} />
      ))}
    </motion.div>
  );
}
