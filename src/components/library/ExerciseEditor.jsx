import { useState } from 'react';
import Sheet from '../pickers/Sheet';
import VideoBlock from '../VideoBlock';
import { useData } from '../../context/DataContext';
import { EXERCISE_TYPES, MUSCLES, GROUPS, normaliseExercise, youtubeIdFromUrl } from '../../data/library';
import { today } from '../../lib/dates';

function Chips({ options, value, onChange, label }) {
  const set = new Set(value);
  return (
    <div className="field">
      <span className="lbl">{label}</span>
      <div className="chip-row">
        {options.map(([k, text]) => (
          <button
            type="button"
            key={k}
            className={`chip ${set.has(k) ? 'active' : ''}`}
            onClick={() => onChange(set.has(k) ? value.filter((x) => x !== k) : [...value, k])}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Create / edit any exercise (built-in or custom). Edits apply to future sessions only — logged history keeps its own snapshot. */
export default function ExerciseEditor({ exercise, isNew, onClose }) {
  const { saveExercise, setExerciseArchived, removeExerciseOverride, duplicateExercise } = useData();
  const [ex, setEx] = useState(() => ({ ...exercise, media: exercise.media || { url: '', start: '', source: '', verified: '' } }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setEx((e) => ({ ...e, ...patch }));
  const timed = ex.type !== 'reps';
  const yt = youtubeIdFromUrl(ex.media?.url);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(e.message || 'Could not save');
      setBusy(false);
    }
  }

  const save = () => {
    if (!ex.name.en.trim() && !ex.name.ar.trim()) {
      setError('Give the exercise a name.');
      return;
    }
    run(() => saveExercise(ex));
  };

  return (
    <Sheet title={isNew ? 'New exercise' : 'Edit exercise'} onClose={onClose}>
      {!isNew && (
        <div className="notice">
          {ex.builtin ? `Built-in (${ex.source}). ` : 'Your own exercise. '}
          Changes apply to <strong>future</strong> sessions — anything you already logged keeps its original name and values.
        </div>
      )}
      <div className="field-row">
        <div className="field">
          <label>Name (English)</label>
          <input value={ex.name.en} onChange={(e) => set({ name: { ...ex.name, en: e.target.value } })} />
        </div>
        <div className="field">
          <label>الاسم (Arabic)</label>
          <input dir="rtl" value={ex.name.ar} onChange={(e) => set({ name: { ...ex.name, ar: e.target.value } })} />
        </div>
      </div>

      <div className="field">
        <label>Type</label>
        <select value={ex.type} onChange={(e) => set({ type: e.target.value })}>
          {EXERCISE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} — {t.hint}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{ex.type === 'cardio' ? 'Rounds' : 'Sets'}</label>
          <input type="number" min="1" inputMode="numeric" value={ex.sets ?? ''} onChange={(e) => set({ sets: e.target.value })} />
        </div>
        {!timed && (
          <div className="field">
            <label>Reps</label>
            <input type="number" min="1" inputMode="numeric" value={ex.reps ?? ''} onChange={(e) => set({ reps: e.target.value })} />
          </div>
        )}
        {timed && (
          <div className="field">
            <label>{ex.type === 'cardio' ? 'Work (s)' : 'Hold (s)'}</label>
            <input type="number" min="1" inputMode="numeric" value={ex.seconds ?? ''} onChange={(e) => set({ seconds: e.target.value })} />
          </div>
        )}
        <div className="field">
          <label>Rest (s)</label>
          <input type="number" min="0" inputMode="numeric" value={ex.rest ?? ''} onChange={(e) => set({ rest: e.target.value })} />
        </div>
        <div className="field">
          <label>Countdown (s)</label>
          <input type="number" min="0" inputMode="numeric" placeholder="default" value={ex.countdown ?? ''} onChange={(e) => set({ countdown: e.target.value })} />
        </div>
      </div>
      {ex.type === 'reps' && (
        <label className="field" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={!!ex.perSide} onChange={(e) => set({ perSide: e.target.checked })} />
          <span>Each set is done on both sides (label only)</span>
        </label>
      )}

      <Chips label="Primary muscles" options={Object.entries(MUSCLES).map(([k, m]) => [k, m.label])} value={ex.primary} onChange={(primary) => set({ primary, secondary: ex.secondary.filter((k) => !primary.includes(k)) })} />
      <Chips label="Secondary muscles" options={Object.entries(MUSCLES).map(([k, m]) => [k, m.label])} value={ex.secondary} onChange={(secondary) => set({ secondary: secondary.filter((k) => !ex.primary.includes(k)) })} />
      <Chips label="Days / sessions" options={GROUPS.map((g) => [g.key, g.short || g.en])} value={ex.groups} onChange={(groups) => set({ groups })} />

      <div className="field">
        <label>Notes</label>
        <textarea value={ex.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      <div className="field">
        <label>Cue / how (الطريقة)</label>
        <textarea dir="auto" value={ex.how} onChange={(e) => set({ how: e.target.value })} />
      </div>
      <div className="field">
        <label>Dosage text (الجرعة)</label>
        <input dir="auto" value={ex.dose} onChange={(e) => set({ dose: e.target.value })} />
      </div>

      <div className="field">
        <span className="lbl">Media (video or image link)</span>
        <input placeholder="https://www.youtube.com/watch?v=…" value={ex.media.url} onChange={(e) => set({ media: { ...ex.media, url: e.target.value } })} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start (s)</label>
          <input type="number" min="0" value={ex.media.start ?? ''} onChange={(e) => set({ media: { ...ex.media, start: e.target.value } })} />
        </div>
        <div className="field">
          <label>Source / credit</label>
          <input value={ex.media.source || ''} onChange={(e) => set({ media: { ...ex.media, source: e.target.value } })} />
        </div>
        <div className="field">
          <label>Verified on</label>
          <input type="date" value={ex.media.verified || ''} onChange={(e) => set({ media: { ...ex.media, verified: e.target.value } })} />
        </div>
      </div>
      <div className="page-actions">
        <button type="button" className="btn small" onClick={() => set({ media: { ...ex.media, verified: today() } })} disabled={!ex.media.url}>
          Mark verified today
        </button>
        <button type="button" className="btn small" onClick={() => set({ media: { url: '', start: '', source: '', verified: '' } })}>
          Clear media
        </button>
      </div>
      {ex.media.url && (yt ? <VideoBlock media={{ url: ex.media.url, start: Number(ex.media.start) || 0 }} /> : <div className="hint">Not a YouTube link — it will open as an external link.</div>)}

      {error && <div className="notice warn">{error}</div>}
      <div className="page-actions">
        <button className="btn primary" disabled={busy} onClick={save}>
          Save
        </button>
        {!isNew && (
          <button className="btn" disabled={busy} onClick={() => run(() => duplicateExercise(normaliseExercise(ex)))}>
            Duplicate
          </button>
        )}
        {!isNew && (
          <button className="btn" disabled={busy} onClick={() => run(() => setExerciseArchived(normaliseExercise(ex), !ex.archived))}>
            {ex.archived ? 'Restore' : 'Archive'}
          </button>
        )}
        {!isNew && ex.builtin && ex.edited && (
          <button className="btn" disabled={busy} onClick={() => run(() => removeExerciseOverride(ex.id))}>
            Reset to original
          </button>
        )}
        {!isNew && !ex.builtin && (
          <button
            className="btn danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Delete this exercise? Your logged history for it is kept.')) run(() => removeExerciseOverride(ex.id));
            }}
          >
            Delete
          </button>
        )}
      </div>
    </Sheet>
  );
}
