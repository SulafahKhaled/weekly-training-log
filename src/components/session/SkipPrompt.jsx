import { useState } from 'react';
import { SkipForward } from 'lucide-react';

/** Inline Skip with the one question: Completed or Incomplete? (the fullscreen timer has its own sheet). */
export default function SkipPrompt({ label = 'Skip', question = 'Mark as…', onChoose, disabled }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button className="btn-reset" disabled={disabled} onClick={() => setAsking(true)}>
        <SkipForward size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
        {label}
      </button>
    );
  }
  return (
    <span className="skip-prompt" role="group" aria-label={question}>
      <span className="hint" style={{ margin: 0 }}>
        {question}
      </span>
      <button
        className="btn small"
        onClick={() => {
          setAsking(false);
          onChoose('completed');
        }}
      >
        Completed
      </button>
      <button
        className="btn small"
        onClick={() => {
          setAsking(false);
          onChoose('incomplete');
        }}
      >
        Incomplete
      </button>
      <button className="btn small" onClick={() => setAsking(false)}>
        ✕
      </button>
    </span>
  );
}
